package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Machine represents an industrial machine.
type Machine struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

// Maintenance represents a scheduled maintenance for a machine.
type Maintenance struct {
	ID           string `json:"id"`
	MachineID    string `json:"machineId"`
	Date         string `json:"date"` // YYYY-MM-DD
	Observations string `json:"observations"`
	StockItemID  string `json:"stockItemId"`
	QuantityUsed int    `json:"quantityUsed"`
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

var (
	machines     = make(map[string]Machine)
	maintenances = make(map[string]Maintenance)
	stock        = make(map[string]StockItem)
	mutex        = &sync.Mutex{}
)

func main() {
	// Seed some data
	id1 := uuid.New().String()
	machines[id1] = Machine{ID: id1, Name: "CNC-001", Status: "active"}
	id2 := uuid.New().String()
	machines[id2] = Machine{ID: id2, Name: "Welder-005", Status: "inactive"}

	maintID := uuid.New().String()
	maintenances[maintID] = Maintenance{ID: maintID, MachineID: id1, Date: time.Now().AddDate(0, 0, 5).Format("2006-01-02"), Observations: "Regular check-up"}

	stockID1 := uuid.New().String()
	stock[stockID1] = StockItem{ID: stockID1, Name: "Filter F-10", Quantity: 50, Unit: "piece", Value: 12.50, Location: "Shelf A-3"}
	stockID2 := uuid.New().String()
	stock[stockID2] = StockItem{ID: stockID2, Name: "Coolant C-5L", Quantity: 20, Unit: "liter", Value: 25.00, Location: "Cabinet B-1"}


	mux := http.NewServeMux()
	mux.HandleFunc("/api/machines", machinesHandler)
	mux.HandleFunc("/api/machines/", machineHandler)
	mux.HandleFunc("/api/maintenances", maintenancesHandler)
	mux.HandleFunc("/api/maintenances/", maintenanceHandler)
	mux.HandleFunc("/api/stock", stockHandler)
	mux.HandleFunc("/api/stock/", stockItemHandler)


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
	id := strings.TrimSuffix(r.URL.Path[len("/api/machines/"):], "/")
	if _, ok := machines[id]; !ok {
		http.Error(w, "Machine not found", http.StatusNotFound)
		return
	}
	switch r.Method {
	case "GET":
		getMachine(w, r, id)
	case "PUT":
		updateMachine(w, r, id)
	case "DELETE":
		deleteMachine(w, r, id)
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
	machine.ID = uuid.New().String()
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
func maintenancesHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	switch r.Method {
	case "GET":
		listMaintenances(w, r)
	case "POST":
		createMaintenance(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func maintenanceHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	id := strings.TrimSuffix(r.URL.Path[len("/api/maintenances/"):], "/")
	if _, ok := maintenances[id]; !ok {
		http.Error(w, "Maintenance not found", http.StatusNotFound)
		return
	}
	switch r.Method {
	case "DELETE":
		deleteMaintenance(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func listMaintenances(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	maintenanceList := make([]Maintenance, 0, len(maintenances))
	for _, m := range maintenances {
		maintenanceList = append(maintenanceList, m)
	}
	json.NewEncoder(w).Encode(maintenanceList)
}

func createMaintenance(w http.ResponseWriter, r *http.Request) {
	var maintenance Maintenance
	if err := json.NewDecoder(r.Body).Decode(&maintenance); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if _, ok := machines[maintenance.MachineID]; !ok {
		http.Error(w, "Invalid machine ID", http.StatusBadRequest)
		return
	}
	if _, err := time.Parse("2006-01-02", maintenance.Date); err != nil {
		http.Error(w, "Invalid date format, please use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	// Handle stock item usage
	if maintenance.StockItemID != "" {
		if maintenance.QuantityUsed <= 0 {
			http.Error(w, "Quantity to use must be positive", http.StatusBadRequest)
			return
		}
		item, ok := stock[maintenance.StockItemID]
		if !ok {
			http.Error(w, "Invalid stock item ID", http.StatusBadRequest)
			return
		}
		if item.Quantity < maintenance.QuantityUsed {
			http.Error(w, "Not enough quantity in stock", http.StatusBadRequest)
			return
		}
		// Decrement stock
		item.Quantity -= maintenance.QuantityUsed
		stock[item.ID] = item
	}

	maintenance.ID = uuid.New().String()
	maintenances[maintenance.ID] = maintenance
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(maintenance)
}

func deleteMaintenance(w http.ResponseWriter, r *http.Request, id string) {
	// Find the maintenance before deleting to get stock info
	maint, ok := maintenances[id]
	if !ok {
		// This case should ideally not be hit due to the check in maintenanceHandler
		http.Error(w, "Maintenance not found", http.StatusNotFound)
		return
	}

	// Replenish stock if item was used
	if maint.StockItemID != "" && maint.QuantityUsed > 0 {
		item, ok := stock[maint.StockItemID]
		if ok {
			item.Quantity += maint.QuantityUsed
			stock[item.ID] = item
		}
	}

	delete(maintenances, id)
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