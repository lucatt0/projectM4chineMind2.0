package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

// Machine represents an industrial machine.
type Machine struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Model        string   `json:"model"`
	Manufacturer string   `json:"manufacturer"`
	Year         int      `json:"year"`
	Status       string   `json:"status"`
	OperatorID   string   `json:"operatorId,omitempty"`
	Sensors      []Sensor `json:"sensors"`
}

type Sensor struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"` // e.g., "temperature", "pressure", "vibration"
}

type StockItem struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Quantity int     `json:"quantity"`
	Unit     string  `json:"unit"`
	Value    float64 `json:"value"`
	Location string  `json:"location"`
}

type Operator struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Maintenance represents a maintenance schedule for a machine.
type Maintenance struct {
	ID          string          `json:"id"`
	MachineID   string          `json:"machineId"`
	Date        string          `json:"date"`
	Description string          `json:"description"`
	Status      string          `json:"status"`
	UsedStock   []UsedStockItem `json:"usedStock"`
}

// UsedStockItem represents a stock item used in a maintenance.
type UsedStockItem struct {
	StockID  string `json:"stockId"`
	Quantity int    `json:"quantity"`
}

var (
	db    *sql.DB
	mutex = &sync.Mutex{}
)

func main() {
	var err error
	db, err = sql.Open("sqlite3", "./m4chinemind.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	createTables()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/machines", machinesHandler)
	mux.HandleFunc("/api/machines/", machineHandler)
	mux.HandleFunc("/api/stock", stockHandler)
	mux.HandleFunc("/api/stock/", stockItemHandler)
	mux.HandleFunc("/api/operators", operatorsHandler)
	mux.HandleFunc("/api/operators/", operatorHandler)
	mux.HandleFunc("/api/maintenance", maintenanceRootHandler)
	mux.HandleFunc("/api/maintenance/", maintenanceIdHandler)
	mux.HandleFunc("/api/reports/", reportsHandler)

	handler := corsMiddleware(mux)

	log.Println("Server starting on port 8080...")
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatalf("Could not start server: %s\n", err)
	}
}

func createTables() {
	createOperatorsTable := `
	CREATE TABLE IF NOT EXISTS operators (
		id TEXT PRIMARY KEY,
		name TEXT
	);`
	_, err := db.Exec(createOperatorsTable)
	if err != nil {
		log.Fatalf("Failed to create operators table: %v", err)
	}

	createMachinesTable := `
	CREATE TABLE IF NOT EXISTS machines (
		id TEXT PRIMARY KEY,
		name TEXT,
		status TEXT,
		operatorId TEXT,
		FOREIGN KEY(operatorId) REFERENCES operators(id)
	);`
	_, err = db.Exec(createMachinesTable)
	if err != nil {
		log.Fatalf("Failed to create machines table: %v", err)
	}

	createSensorsTable := `
	CREATE TABLE IF NOT EXISTS sensors (
		id TEXT PRIMARY KEY,
		name TEXT,
		type TEXT,
		machineId TEXT,
		FOREIGN KEY(machineId) REFERENCES machines(id)
	);`
	_, err = db.Exec(createSensorsTable)
	if err != nil {
		log.Fatalf("Failed to create sensors table: %v", err)
	}

	createStockTable := `
	CREATE TABLE IF NOT EXISTS stock (
		id TEXT PRIMARY KEY,
		name TEXT,
		quantity INTEGER,
		unit TEXT,
		value REAL,
		location TEXT
	);`
	_, err = db.Exec(createStockTable)
	if err != nil {
		log.Fatalf("Failed to create stock table: %v", err)
	}

	createMaintenanceTable := `
	CREATE TABLE IF NOT EXISTS maintenance (
		id TEXT PRIMARY KEY,
		machineId TEXT,
		date TEXT,
		description TEXT,
		status TEXT,
		FOREIGN KEY(machineId) REFERENCES machines(id)
	);`
	_, err = db.Exec(createMaintenanceTable)
	if err != nil {
		log.Fatalf("Failed to create maintenance table: %v", err)
	}

	createMaintenanceStockTable := `
	CREATE TABLE IF NOT EXISTS maintenance_stock (
		maintenanceId TEXT,
		stockId TEXT,
		quantity INTEGER,
		PRIMARY KEY(maintenanceId, stockId),
		FOREIGN KEY(maintenanceId) REFERENCES maintenance(id),
		FOREIGN KEY(stockId) REFERENCES stock(id)
	);`
	_, err = db.Exec(createMaintenanceStockTable)
	if err != nil {
		log.Fatal(err)
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
	id := strings.TrimPrefix(r.URL.Path, "/api/machines/")
	id = strings.TrimSuffix(id, "/sensors") // Handle /sensors endpoint

	// Check if machine exists
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM machines WHERE id = ?)", id).Scan(&exists)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "Machine not found", http.StatusNotFound)
		return
	}

	if strings.HasSuffix(r.URL.Path, "/sensors") {
		switch r.Method {
		case "GET":
			getMachineSensors(w, r, id)
		case "POST":
			createMachineSensor(w, r, id)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
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
	id := strings.TrimPrefix(r.URL.Path, "/api/operators/")

	// Check if operator exists
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM operators WHERE id = ?)", id).Scan(&exists)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !exists {
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
	rows, err := db.Query("SELECT id, name FROM operators")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	operators := []Operator{}
	for rows.Next() {
		var op Operator
		if err := rows.Scan(&op.ID, &op.Name); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		operators = append(operators, op)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(operators)
}

func createOperator(w http.ResponseWriter, r *http.Request) {
	var op Operator
	if err := json.NewDecoder(r.Body).Decode(&op); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	op.ID = uuid.New().String()

	_, err := db.Exec("INSERT INTO operators (id, name) VALUES (?, ?)", op.ID, op.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(op)
}

func getOperator(w http.ResponseWriter, r *http.Request, id string) {
	var op Operator
	err := db.QueryRow("SELECT id, name FROM operators WHERE id = ?", id).Scan(&op.ID, &op.Name)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Operator not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(op)
}

func updateOperator(w http.ResponseWriter, r *http.Request, id string) {
	var op Operator
	if err := json.NewDecoder(r.Body).Decode(&op); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := db.Exec("UPDATE operators SET name = ? WHERE id = ?", op.Name, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	op.ID = id
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(op)
}

func deleteOperator(w http.ResponseWriter, r *http.Request, id string) {
	// Optional: Unassign operator from any machines before deleting
	_, err := db.Exec("UPDATE machines SET operatorId = NULL WHERE operatorId = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = db.Exec("DELETE FROM operators WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func listMachines(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, name, status, operatorId FROM machines")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	machines := []Machine{}
	for rows.Next() {
		var m Machine
		var operatorID sql.NullString
		if err := rows.Scan(&m.ID, &m.Name, &m.Status, &operatorID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if operatorID.Valid {
			m.OperatorID = operatorID.String
		}

		// Check for maintenance today
		var maintenanceCount int
		today := time.Now().Format("2006-01-02")
		err := db.QueryRow("SELECT COUNT(*) FROM maintenance WHERE machineId = ? AND date = ?", m.ID, today).Scan(&maintenanceCount)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if maintenanceCount > 0 {
			m.Status = "Em manutenção"
		}

		sensorRows, err := db.Query("SELECT id, name, type FROM sensors WHERE machineId = ?", m.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer sensorRows.Close()

		sensors := []Sensor{}
		for sensorRows.Next() {
			var s Sensor
			if err := sensorRows.Scan(&s.ID, &s.Name, &s.Type); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			sensors = append(sensors, s)
		}
		m.Sensors = sensors

		machines = append(machines, m)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(machines)
}

func createMachine(w http.ResponseWriter, r *http.Request) {
	var m Machine
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	m.ID = uuid.New().String()

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("INSERT INTO machines (id, name, status, operatorId) VALUES (?, ?, ?, ?)", m.ID, m.Name, m.Status, m.OperatorID)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, s := range m.Sensors {
		s.ID = uuid.New().String()
		_, err := tx.Exec("INSERT INTO sensors (id, name, type, machineId) VALUES (?, ?, ?, ?)", s.ID, s.Name, s.Type, m.ID)
		if err != nil {
			tx.Rollback()
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(m)
}

func getMachine(w http.ResponseWriter, r *http.Request, id string) {
	var m Machine
	var operatorID sql.NullString
	err := db.QueryRow("SELECT id, name, status, operatorId FROM machines WHERE id = ?", id).Scan(&m.ID, &m.Name, &m.Status, &operatorID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Machine not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}
	if operatorID.Valid {
		m.OperatorID = operatorID.String
	}

	// Check for maintenance today
	var maintenanceCount int
	today := time.Now().Format("2006-01-02")
	err = db.QueryRow("SELECT COUNT(*) FROM maintenance WHERE machineId = ? AND date = ?", m.ID, today).Scan(&maintenanceCount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if maintenanceCount > 0 {
		m.Status = "Em manutenção"
	}

	sensorRows, err := db.Query("SELECT id, name, type FROM sensors WHERE machineId = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer sensorRows.Close()

	sensors := []Sensor{}
	for sensorRows.Next() {
		var s Sensor
		if err := sensorRows.Scan(&s.ID, &s.Name, &s.Type); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		sensors = append(sensors, s)
	}
	m.Sensors = sensors

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}

func updateMachine(w http.ResponseWriter, r *http.Request, id string) {
	var m Machine
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("UPDATE machines SET name = ?, status = ?, operatorId = ? WHERE id = ?", m.Name, m.Status, m.OperatorID, id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("DELETE FROM sensors WHERE machineId = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, s := range m.Sensors {
		s.ID = uuid.New().String()
		_, err := tx.Exec("INSERT INTO sensors (id, name, type, machineId) VALUES (?, ?, ?, ?)", s.ID, s.Name, s.Type, id)
		if err != nil {
			tx.Rollback()
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	m.ID = id
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}

func deleteMachine(w http.ResponseWriter, r *http.Request, id string) {
	// First, delete associated sensors
	_, err := db.Exec("DELETE FROM sensors WHERE machineId = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Then, delete the machine
	_, err = db.Exec("DELETE FROM machines WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func getMachineSensors(w http.ResponseWriter, r *http.Request, machineID string) {
	rows, err := db.Query("SELECT id, name, type FROM sensors WHERE machineId = ?", machineID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	sensors := []Sensor{}
	for rows.Next() {
		var s Sensor
		if err := rows.Scan(&s.ID, &s.Name, &s.Type); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		sensors = append(sensors, s)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sensors)
}

func createMachineSensor(w http.ResponseWriter, r *http.Request, machineID string) {
	var s Sensor
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.ID = uuid.New().String()

	_, err := db.Exec("INSERT INTO sensors (id, name, type, machineId) VALUES (?, ?, ?, ?)", s.ID, s.Name, s.Type, machineID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(s)
}

func getMaintenances(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, machineId, date, description, status FROM maintenance")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	maintenances := make([]Maintenance, 0)
	for rows.Next() {
		var m Maintenance
		if err := rows.Scan(&m.ID, &m.MachineID, &m.Date, &m.Description, &m.Status); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		stockRows, err := db.Query("SELECT stockId, quantity FROM maintenance_stock WHERE maintenanceId = ?", m.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer stockRows.Close()

		usedStock := make([]UsedStockItem, 0)
		for stockRows.Next() {
			var item UsedStockItem
			if err := stockRows.Scan(&item.StockID, &item.Quantity); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			usedStock = append(usedStock, item)
		}
		m.UsedStock = usedStock

		maintenances = append(maintenances, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(maintenances)
}

func maintenanceRootHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		getMaintenances(w, r)
	case "POST":
		createMaintenance(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func maintenanceIdHandler(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/maintenance/")
	if id == "" {
		if r.Method == "GET" {
			getMaintenances(w, r)
		} else {
			http.Error(w, "Method not allowed for /api/maintenance/", http.StatusMethodNotAllowed)
		}
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

func reportsHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if path == "/api/reports/used-stock" {
		getUsedStockReport(w, r)
	} else if path == "/api/reports/scheduled-maintenances" {
		getScheduledMaintenancesReport(w, r)
	} else {
		http.NotFound(w, r)
	}
}

func getUsedStockReport(w http.ResponseWriter, r *http.Request) {
	month := r.URL.Query().Get("month")
	year := r.URL.Query().Get("year")

	query := `
		SELECT s.name, ms.quantity, m.date
		FROM maintenance_stock ms
		JOIN stock s ON ms.stockId = s.id
		JOIN maintenance m ON ms.maintenanceId = m.id
	`
	args := []interface{}{}

	if month != "" && year != "" {
		query += " WHERE CAST(strftime('%m', m.date) AS INTEGER) = ? AND CAST(strftime('%Y', m.date) AS INTEGER) = ?"
		args = append(args, month, year)
	}

	query += " ORDER BY m.date DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	report := make([]struct {
		ItemName string `json:"itemName"`
		Quantity int    `json:"quantity"`
		Date     string `json:"date"`
	}, 0)
	for rows.Next() {
		var item struct {
			ItemName string `json:"itemName"`
			Quantity int    `json:"quantity"`
			Date     string `json:"date"`
		}
		if err := rows.Scan(&item.ItemName, &item.Quantity, &item.Date); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		report = append(report, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

func getScheduledMaintenancesReport(w http.ResponseWriter, r *http.Request) {
	month := r.URL.Query().Get("month")
	year := r.URL.Query().Get("year")

	query := `
		SELECT maint.id, m.name, maint.date, maint.description
		FROM maintenance maint
		JOIN machines m ON maint.machineId = m.id
		WHERE maint.status = 'scheduled'
	`
	args := []interface{}{}

	if month != "" && year != "" {
		query += " AND CAST(strftime('%m', maint.date) AS INTEGER) = ? AND CAST(strftime('%Y', maint.date) AS INTEGER) = ?"
		args = append(args, month, year)
	}

	query += " ORDER BY maint.date"

	rows, err := db.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	report := make([]struct {
		Id          string `json:"id"`
		MachineName string `json:"machineName"`
		Date        string `json:"date"`
		Description string `json:"description"`
	}, 0)
	for rows.Next() {
		var item struct {
			Id          string `json:"id"`
			MachineName string `json:"machineName"`
			Date        string `json:"date"`
			Description string `json:"description"`
		}
		if err := rows.Scan(&item.Id, &item.MachineName, &item.Date, &item.Description); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		report = append(report, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

func listMaintenances(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, machineId, description, date, status FROM maintenance")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	maintenances := []Maintenance{}
	for rows.Next() {
		var m Maintenance
		if err := rows.Scan(&m.ID, &m.MachineID, &m.Description, &m.Date, &m.Status); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		// Fetch used stock for each maintenance
		stockRows, err := db.Query("SELECT stockId, quantity FROM maintenance_stock WHERE maintenanceId = ?", m.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		usedStock := []UsedStockItem{}
		for stockRows.Next() {
			var item UsedStockItem
			if err := stockRows.Scan(&item.StockID, &item.Quantity); err != nil {
				stockRows.Close()
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			usedStock = append(usedStock, item)
		}
		stockRows.Close()
		m.UsedStock = usedStock
		maintenances = append(maintenances, m)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(maintenances)
}

func reportUsedStock(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT si.name, usi.quantity, m.date 
		FROM used_stock_items usi
		JOIN stock_items si ON usi.stock_item_id = si.id
		JOIN maintenance m ON usi.maintenance_id = m.id
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type UsedStockReportItem struct {
		ItemName string `json:"itemName"`
		Quantity int    `json:"quantity"`
		Date     string `json:"date"`
	}

	var report []UsedStockReportItem
	for rows.Next() {
		var item UsedStockReportItem
		if err := rows.Scan(&item.ItemName, &item.Quantity, &item.Date); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		report = append(report, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

func reportScheduledMaintenances(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT m.id, m.date, m.description, ma.name 
		FROM maintenance m
		JOIN machines ma ON m.machine_id = ma.id
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type ScheduledMaintenanceReportItem struct {
		ID          string `json:"id"`
		Date        string `json:"date"`
		Description string `json:"description"`
		MachineName string `json:"machineName"`
	}

	var report []ScheduledMaintenanceReportItem
	for rows.Next() {
		var item ScheduledMaintenanceReportItem
		if err := rows.Scan(&item.ID, &item.Date, &item.Description, &item.MachineName); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		report = append(report, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

func createMaintenance(w http.ResponseWriter, r *http.Request) {
	var maint Maintenance
	if err := json.NewDecoder(r.Body).Decode(&maint); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	maint.ID = uuid.New().String()

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	stmt, err := tx.Prepare("INSERT INTO maintenance(id, machineId, date, description, status) VALUES(?, ?, ?, ?, ?)")
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	_, err = stmt.Exec(maint.ID, maint.MachineID, maint.Date, maint.Description, "scheduled")
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if len(maint.UsedStock) > 0 {
		stockStmt, err := tx.Prepare("INSERT INTO maintenance_stock(maintenanceId, stockId, quantity) VALUES(?, ?, ?)")
		if err != nil {
			tx.Rollback()
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer stockStmt.Close()

		for _, item := range maint.UsedStock {
			_, err = stockStmt.Exec(maint.ID, item.StockID, item.Quantity)
			if err != nil {
				tx.Rollback()
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Update stock quantity
			updateStockStmt, err := tx.Prepare("UPDATE stock SET quantity = quantity - ? WHERE id = ?")
			if err != nil {
				tx.Rollback()
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			defer updateStockStmt.Close()

			_, err = updateStockStmt.Exec(item.Quantity, item.StockID)
			if err != nil {
				tx.Rollback()
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(maint)
}

func getMaintenance(w http.ResponseWriter, r *http.Request, id string) {
	var maint Maintenance
	err := db.QueryRow("SELECT id, machineId, date, description, status FROM maintenance WHERE id = ?", id).Scan(&maint.ID, &maint.MachineID, &maint.Date, &maint.Description, &maint.Status)
	if err != nil {
		if err == sql.ErrNoRows {
			http.NotFound(w, r)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	rows, err := db.Query("SELECT stockId, quantity FROM maintenance_stock WHERE maintenanceId = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var usedStock UsedStockItem
		if err := rows.Scan(&usedStock.StockID, &usedStock.Quantity); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		maint.UsedStock = append(maint.UsedStock, usedStock)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(maint)
}

func updateMaintenance(w http.ResponseWriter, r *http.Request, id string) {
	var maint Maintenance
	if err := json.NewDecoder(r.Body).Decode(&maint); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("UPDATE maintenance SET machineId = ?, date = ?, description = ?, status = ? WHERE id = ?", maint.MachineID, maint.Date, maint.Description, maint.Status, id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("DELETE FROM maintenance_stock WHERE maintenanceId = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if len(maint.UsedStock) > 0 {
		stockStmt, err := tx.Prepare("INSERT INTO maintenance_stock(maintenanceId, stockId, quantity) VALUES(?, ?, ?)")
		if err != nil {
			tx.Rollback()
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer stockStmt.Close()

		for _, item := range maint.UsedStock {
			_, err = stockStmt.Exec(id, item.StockID, item.Quantity)
			if err != nil {
				tx.Rollback()
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(maint)
}

func deleteMaintenance(w http.ResponseWriter, r *http.Request, id string) {
	mutex.Lock()
	defer mutex.Unlock()
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Restore stock quantities
	var usedStock []UsedStockItem
	rows, err := tx.Query("SELECT stockId, quantity FROM maintenance_stock WHERE maintenanceId = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	for rows.Next() {
		var item UsedStockItem
		if err := rows.Scan(&item.StockID, &item.Quantity); err != nil {
			rows.Close()
			tx.Rollback()
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		usedStock = append(usedStock, item)
	}
	rows.Close()

	for _, item := range usedStock {
		_, err = tx.Exec("UPDATE stock SET quantity = quantity + ? WHERE id = ?", item.Quantity, item.StockID)
		if err != nil {
			tx.Rollback()
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Delete from maintenance_stock
	_, err = tx.Exec("DELETE FROM maintenance_stock WHERE maintenanceId = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete from maintenance
	_, err = tx.Exec("DELETE FROM maintenance WHERE id = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func stockHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	switch r.Method {
	case "GET":
		listStock(w, r)
	case "POST":
		createStockItem(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func stockItemHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	id := strings.TrimPrefix(r.URL.Path, "/api/stock/")

	// Check if stock item exists
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM stock WHERE id = ?)", id).Scan(&exists)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !exists {
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

func listStock(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, name, quantity, unit, value, location FROM stock")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	stock := []StockItem{}
	for rows.Next() {
		var item StockItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Quantity, &item.Unit, &item.Value, &item.Location); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		stock = append(stock, item)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stock)
}

func createStockItem(w http.ResponseWriter, r *http.Request) {
	var item StockItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	item.ID = uuid.New().String()

	_, err := db.Exec("INSERT INTO stock (id, name, quantity, unit, value, location) VALUES (?, ?, ?, ?, ?, ?)", item.ID, item.Name, item.Quantity, item.Unit, item.Value, item.Location)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func getStockItem(w http.ResponseWriter, r *http.Request, id string) {
	var item StockItem
	err := db.QueryRow("SELECT id, name, quantity, unit, value, location FROM stock WHERE id = ?", id).Scan(&item.ID, &item.Name, &item.Quantity, &item.Unit, &item.Value, &item.Location)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Stock item not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func updateStockItem(w http.ResponseWriter, r *http.Request, id string) {
	var item StockItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := db.Exec("UPDATE stock SET name = ?, quantity = ?, unit = ?, value = ?, location = ? WHERE id = ?", item.Name, item.Quantity, item.Unit, item.Value, item.Location, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	item.ID = id
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func deleteStockItem(w http.ResponseWriter, r *http.Request, id string) {
	_, err := db.Exec("DELETE FROM stock WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
