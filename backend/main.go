package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"

	"github.com/google/uuid"
)

// Machine represents an industrial machine.
type Machine struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Status     string   `json:"status"`
	OperatorID string   `json:"operatorId,omitempty"`
	Sensors    []Sensor `json:"sensors"`
}

// StockItem represents an item in the stock.
type StockItem struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Quantity int     `json:"quantity"`
	Unit     string  `json:"unit"`
	Value    float64 `json:"value"`
	Location string  `json:"location"`
}

// Operator represents a machine operator.
type Operator struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Sensor represents a sensor that can be attached to a machine.
type Sensor struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"` // e.g., "temperature", "pressure", "vibration"
}

// Maintenance represents a maintenance schedule for a machine.
type Maintenance struct {
	ID          string          `json:"id"`
	MachineID   string          `json:"machineId"`
	Date        string          `json:"date"`
	Description string          `json:"description"`
	UsedStock   []UsedStockItem `json:"usedStock"`
}

// UsedStockItem represents a stock item used in a maintenance.
type UsedStockItem struct {
	StockItemID string `json:"stockItemId"`
	Quantity    int    `json:"quantity"`
}

var (
	machines    = make(map[string]Machine)
	stock       = make(map[string]StockItem)
	operators   = make(map[string]Operator)
	maintenance = make(map[string]Maintenance)
	mutex       = &sync.Mutex{}
)

func main() {
	// Seed some data
	opID1 := uuid.New().String()
	operators[opID1] = Operator{ID: opID1, Name: "John Doe"}
	opID2 := uuid.New().String()
	operators[opID2] = Operator{ID: opID2, Name: "Jane Smith"}

	id1 := uuid.New().String()
	machines[id1] = Machine{ID: id1, Name: "CNC-001", Status: "active", OperatorID: opID1, Sensors: []Sensor{{ID: uuid.New().String(), Name: "Temp-01", Type: "temperature"}}}
	id2 := uuid.New().String()
	machines[id2] = Machine{ID: id2, Name: "Welder-005", Status: "inactive"}

	stockID1 := uuid.New().String()
	stock[stockID1] = StockItem{ID: stockID1, Name: "Filter F-10", Quantity: 50, Unit: "piece", Value: 12.50, Location: "Shelf A-3"}
	stockID2 := uuid.New().String()
	stock[stockID2] = StockItem{ID: stockID2, Name: "Coolant C-5L", Quantity: 20, Unit: "liter", Value: 25.00, Location: "Cabinet B-1"}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/machines", machinesHandler)
	mux.HandleFunc("/api/machines/", machineHandler)
	mux.HandleFunc("/api/stock", stockHandler)
	mux.HandleFunc("/api/stock/", stockItemHandler)
	mux.HandleFunc("/api/operators", operatorsHandler)
	mux.HandleFunc("/api/operators/", operatorHandler)
	mux.HandleFunc("/api/maintenance", maintenanceHandler)
	mux.HandleFunc("/api/maintenance/", maintenanceItemHandler)

	handler := corsMiddleware(mux)

	log.Println("Server starting on port 8080...")
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatalf("Could not start server: %s\n", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Machine Handlers
func machinesHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	switch r.Method {
	case "GET":
		listMachines(w, r)
	case "POST":
		createMachine(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func machineHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	machineID := pathParts[2]

	if _, ok := machines[machineID]; !ok {
		http.Error(w, "Machine not found", http.StatusNotFound)
		return
	}

	if len(pathParts) > 3 && pathParts[3] == "sensors" {
		if len(pathParts) == 4 {
			machineSensorsHandler(w, r, machineID)
			return
		}
		if len(pathParts) == 5 {
			sensorID := pathParts[4]
			machineSensorHandler(w, r, machineID, sensorID)
			return
		}
	}

	switch r.Method {
	case "GET":
		getMachine(w, r, machineID)
	case "PUT":
		updateMachine(w, r, machineID)
	case "DELETE":
		deleteMachine(w, r, machineID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func listMachines(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	machineList := make([]Machine, 0, len(machines))
	for _, machine := range machines {
		machineList = append(machineList, machine)
	}
	json.NewEncoder(w).Encode(machineList)
}

func createMachine(w http.ResponseWriter, r *http.Request) {
	var machine Machine
	if err := json.NewDecoder(r.Body).Decode(&machine); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if machine.OperatorID != "" {
		if _, ok := operators[machine.OperatorID]; !ok {
			http.Error(w, "Invalid operator ID", http.StatusBadRequest)
			return
		}
	}
	machine.ID = uuid.New().String()
	// Assign IDs to new sensors
	for i := range machine.Sensors {
		machine.Sensors[i].ID = uuid.New().String()
	}
	machines[machine.ID] = machine
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(machine)
}

func getMachine(w http.ResponseWriter, r *http.Request, id string) {
	machine, _ := machines[id]
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(machine)
}

func updateMachine(w http.ResponseWriter, r *http.Request, id string) {
	var updatedMachine Machine
	if err := json.NewDecoder(r.Body).Decode(&updatedMachine); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if updatedMachine.OperatorID != "" {
		if _, ok := operators[updatedMachine.OperatorID]; !ok {
			http.Error(w, "Invalid operator ID", http.StatusBadRequest)
			return
		}
	}

	existingMachine, _ := machines[id]
	updatedMachine.Sensors = existingMachine.Sensors

	updatedMachine.ID = id
	machines[id] = updatedMachine
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedMachine)
}

func deleteMachine(w http.ResponseWriter, r *http.Request, id string) {
	delete(machines, id)
	w.WriteHeader(http.StatusNoContent)
}

// Maintenance Handlers
func maintenanceHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	switch r.Method {
	case "GET":
		listMaintenance(w, r)
	case "POST":
		createMaintenance(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func maintenanceItemHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	id := strings.TrimSuffix(r.URL.Path[len("/api/maintenance/"):], "/")
	if _, ok := maintenance[id]; !ok {
		http.Error(w, "Maintenance schedule not found", http.StatusNotFound)
		return
	}
	switch r.Method {
	case "GET":
		getMaintenance(w, r, id)
	case "PUT":
		updateMaintenance(w, r, id)
	case "DELETE":
		deleteMaintenance(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func listMaintenance(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	maintenanceList := make([]Maintenance, 0, len(maintenance))
	for _, m := range maintenance {
		maintenanceList = append(maintenanceList, m)
	}
	json.NewEncoder(w).Encode(maintenanceList)
}

func createMaintenance(w http.ResponseWriter, r *http.Request) {
	var m Maintenance
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if _, ok := machines[m.MachineID]; !ok {
		http.Error(w, "Machine not found", http.StatusBadRequest)
		return
	}

	// Handle stock
	for _, usedItem := range m.UsedStock {
		item, ok := stock[usedItem.StockItemID]
		if !ok {
			http.Error(w, "Stock item not found: "+usedItem.StockItemID, http.StatusBadRequest)
			return
		}
		if item.Quantity < usedItem.Quantity {
			http.Error(w, "Not enough stock for item: "+item.Name, http.StatusBadRequest)
			return
		}
		item.Quantity -= usedItem.Quantity
		stock[usedItem.StockItemID] = item
	}

	m.ID = uuid.New().String()
	maintenance[m.ID] = m
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(m)
}

func getMaintenance(w http.ResponseWriter, r *http.Request, id string) {
	m, _ := maintenance[id]
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}

func updateMaintenance(w http.ResponseWriter, r *http.Request, id string) {
	var updatedMaintenance Maintenance
	if err := json.NewDecoder(r.Body).Decode(&updatedMaintenance); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if _, ok := machines[updatedMaintenance.MachineID]; !ok {
		http.Error(w, "Machine not found", http.StatusBadRequest)
		return
	}

	// Restore old stock quantities
	oldMaintenance, ok := maintenance[id]
	if !ok {
		http.Error(w, "Maintenance schedule not found for update", http.StatusNotFound)
		return
	}
	for _, usedItem := range oldMaintenance.UsedStock {
		item, ok := stock[usedItem.StockItemID]
		if ok {
			item.Quantity += usedItem.Quantity
			stock[usedItem.StockItemID] = item
		}
	}

	// Deduct new stock quantities
	for _, usedItem := range updatedMaintenance.UsedStock {
		item, ok := stock[usedItem.StockItemID]
		if !ok {
			http.Error(w, "Stock item not found: "+usedItem.StockItemID, http.StatusBadRequest)
			return
		}
		if item.Quantity < usedItem.Quantity {
			// Re-add the previously restored stock before erroring out
			for _, oldUsedItem := range oldMaintenance.UsedStock {
				item, ok := stock[oldUsedItem.StockItemID]
				if ok {
					item.Quantity -= oldUsedItem.Quantity
					stock[oldUsedItem.StockItemID] = item
				}
			}
			http.Error(w, "Not enough stock for item: "+item.Name, http.StatusBadRequest)
			return
		}
		item.Quantity -= usedItem.Quantity
		stock[usedItem.StockItemID] = item
	}

	updatedMaintenance.ID = id
	maintenance[id] = updatedMaintenance
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedMaintenance)
}

func deleteMaintenance(w http.ResponseWriter, r *http.Request, id string) {
	m, ok := maintenance[id]
	if !ok {
		http.Error(w, "Maintenance schedule not found", http.StatusNotFound)
		return
	}

	// Restore stock
	for _, usedItem := range m.UsedStock {
		item, ok := stock[usedItem.StockItemID]
		if ok {
			item.Quantity += usedItem.Quantity
			stock[usedItem.StockItemID] = item
		}
	}

	delete(maintenance, id)
	w.WriteHeader(http.StatusNoContent)
}

// Stock Handlers
func stockHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	switch r.Method {
	case "GET":
		listStockItems(w, r)
	case "POST":
		createStockItem(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func stockItemHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	id := strings.TrimSuffix(r.URL.Path[len("/api/stock/"):], "/")
	if _, ok := stock[id]; !ok {
		http.Error(w, "Stock item not found", http.StatusNotFound)
		return
	}
	switch r.Method {
	case "GET":
		getStockItem(w, r, id)
	case "PUT":
		updateStockItem(w, r, id)
	case "DELETE":
		deleteStockItem(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func listStockItems(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	stockList := make([]StockItem, 0, len(stock))
	for _, item := range stock {
		stockList = append(stockList, item)
	}
	json.NewEncoder(w).Encode(stockList)
}

func createStockItem(w http.ResponseWriter, r *http.Request) {
	var item StockItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	item.ID = uuid.New().String()
	stock[item.ID] = item
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func getStockItem(w http.ResponseWriter, r *http.Request, id string) {
	item, _ := stock[id]
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func updateStockItem(w http.ResponseWriter, r *http.Request, id string) {
	var updatedItem StockItem
	if err := json.NewDecoder(r.Body).Decode(&updatedItem); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	updatedItem.ID = id
	stock[id] = updatedItem
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedItem)
}

func deleteStockItem(w http.ResponseWriter, r *http.Request, id string) {
	delete(stock, id)
	w.WriteHeader(http.StatusNoContent)
}

// Operator Handlers
func operatorsHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	switch r.Method {
	case "GET":
		listOperators(w, r)
	case "POST":
		createOperator(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func operatorHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	id := strings.TrimSuffix(r.URL.Path[len("/api/operators/"):], "/")
	if _, ok := operators[id]; !ok {
		http.Error(w, "Operator not found", http.StatusNotFound)
		return
	}
	switch r.Method {
	case "GET":
		getOperator(w, r, id)
	case "PUT":
		updateOperator(w, r, id)
	case "DELETE":
		deleteOperator(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func listOperators(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	operatorList := make([]Operator, 0, len(operators))
	for _, operator := range operators {
		operatorList = append(operatorList, operator)
	}
	json.NewEncoder(w).Encode(operatorList)
}

func createOperator(w http.ResponseWriter, r *http.Request) {
	var operator Operator
	if err := json.NewDecoder(r.Body).Decode(&operator); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	operator.ID = uuid.New().String()
	operators[operator.ID] = operator
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(operator)
}

func getOperator(w http.ResponseWriter, r *http.Request, id string) {
	operator, _ := operators[id]
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(operator)
}

func updateOperator(w http.ResponseWriter, r *http.Request, id string) {
	var updatedOperator Operator
	if err := json.NewDecoder(r.Body).Decode(&updatedOperator); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	updatedOperator.ID = id
	operators[id] = updatedOperator
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedOperator)
}

func deleteOperator(w http.ResponseWriter, r *http.Request, id string) {
	// Optional: Unassign operator from any machines before deleting
	for k, v := range machines {
		if v.OperatorID == id {
			v.OperatorID = ""
			machines[k] = v
		}
	}
	delete(operators, id)
	w.WriteHeader(http.StatusNoContent)
}

func machineSensorsHandler(w http.ResponseWriter, r *http.Request, machineID string) {
	switch r.Method {
	case "GET":
		listMachineSensors(w, r, machineID)
	case "POST":
		addSensorToMachine(w, r, machineID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func machineSensorHandler(w http.ResponseWriter, r *http.Request, machineID, sensorID string) {
	switch r.Method {
	case "DELETE":
		removeSensorFromMachine(w, r, machineID, sensorID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func listMachineSensors(w http.ResponseWriter, r *http.Request, machineID string) {
	machine, _ := machines[machineID]
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(machine.Sensors)
}

func addSensorToMachine(w http.ResponseWriter, r *http.Request, machineID string) {
	var sensor Sensor
	if err := json.NewDecoder(r.Body).Decode(&sensor); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	sensor.ID = uuid.New().String()

	machine := machines[machineID]
	machine.Sensors = append(machine.Sensors, sensor)
	machines[machineID] = machine

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(sensor)
}

func removeSensorFromMachine(w http.ResponseWriter, r *http.Request, machineID, sensorID string) {
	machine := machines[machineID]
	var found bool
	var updatedSensors []Sensor
	for _, s := range machine.Sensors {
		if s.ID == sensorID {
			found = true
		} else {
			updatedSensors = append(updatedSensors, s)
		}
	}

	if !found {
		http.Error(w, "Sensor not found on this machine", http.StatusNotFound)
		return
	}

	machine.Sensors = updatedSensors
	machines[machineID] = machine
	w.WriteHeader(http.StatusNoContent)
}
