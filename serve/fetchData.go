package main

import (
	"encoding/json"
	"os"

	"litehell.info/caucalendar/crawl/crawl"
)

func fetchData() *[]crawl.CAUSchedule {
	f, err := os.Open("data/events.json")
	if err != nil {
		result := make([]crawl.CAUSchedule, 0)
		return &result
	}
	defer f.Close()

	result := make([]crawl.CAUSchedule, 0)
	jsonDecoder := json.NewDecoder(f)
	_ = jsonDecoder.Decode(&result)

	return &result
}
