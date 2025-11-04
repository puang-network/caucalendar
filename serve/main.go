package main

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"litehell.info/caucalendar/crawl/crawl"
)

func filterSchedule(allSchedules *[]crawl.CAUSchedule, fromParam string, toParam string) *[]crawl.CAUSchedule {
	// Get default parameters
	defaultYearFrom, defaultYearTo := crawl.DefaultYear()

	// Use default parameter value if not provided or invalid
	yearFrom, yearTo := defaultYearFrom, defaultYearTo
	if fromParam != "" {
		var err error
		yearFrom, err = strconv.Atoi(fromParam)
		if err != nil || yearFrom < defaultYearFrom {
			yearFrom = defaultYearFrom
		}
	}
	if toParam != "" {
		var err error
		yearTo, err = strconv.Atoi(toParam)
		if err != nil || yearTo > defaultYearTo {
			yearTo = defaultYearTo
		}
	}

	// Swap parameters if they're somewaht wrong
	if yearFrom > yearTo {
		yearFrom, yearTo = yearTo, yearFrom
	}

	// Filter schedules
	tz, _ := time.LoadLocation("Asia/Seoul")
	from := time.Date(yearFrom, 1, 1, 0, 0, 0, 0, tz)
	to := time.Date(yearTo, 12, 31, 23, 59, 59, 59, tz)

	filtered := make([]crawl.CAUSchedule, 0)
	for _, i := range *allSchedules {
		if i.StartDate.Compare(from) >= 0 && i.EndDate.Compare(to) <= 0 {
			filtered = append(filtered, i)
		}
	}

	return &filtered
}

func icsHandler(w http.ResponseWriter, r *http.Request) {
	qs := r.URL.Query()
	from := ""
	to := ""
	if len(qs["from"]) > 0 {
		from = qs.Get("from")
	}
	if len(qs["to"]) > 0 {
		to = qs.Get("to")
	}

	allSchedules := fetchData()
	filtered := filterSchedule(allSchedules, from, to)
	ics := GenerateIcs(filtered)

	w.Header().Set("Content-Type", "text/calendar")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(ics))
}

func main() {
	http.HandleFunc("/ics", icsHandler)
	port := ":8080"
	log.Printf("Starting local server on %s (endpoint: /ics?from=YYYY&to=YYYY)", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
