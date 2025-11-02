package com.venuesug.pkg.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.json.JSONArray;
import com.venuesug.pkg.service.BookingService;

@RestController
@RequestMapping("/vsapi/chat")
@CrossOrigin(origins = "http://54.146.235.10:3000")
public class ChatController {
    
    private static final String EXTRACTION_API_URL = "http://18.232.136.136:8000/extract";
    private static final String EMAIL_API_URL = "http://18.232.136.136:8000/invite";
    
    private final RestTemplate restTemplate;
    private final BookingService bookingService;
    
    @Autowired
    public ChatController(RestTemplate restTemplate, BookingService bookingService) {
        this.restTemplate = restTemplate;
        this.bookingService = bookingService;
    }
    
	@PostMapping("/query")
    public Map<String, Object> chat(@RequestBody Map<String, String> payload) {
        try {
            bookingService.removeExpiredBookings();
            
            String query = payload.get("query");
            
            if (query == null || query.trim().isEmpty()) {
                return Map.of("error", "Query cannot be empty");
            }
            
            Map<String, Object> extractedData = callExtractionAPI(query);
            //String sampleData = "{\r\n  \"nodes\": [\r\n    {\r\n      \"id\": \"root\",\r\n      \"label\": \"Query\",\r\n      \"group\": \"root\",\r\n      \"val\": 8,\r\n      \"meta\": {\r\n        \"attendees\": 200,\r\n        \"min_coverage\": 0.6,\r\n        \"required\": [\r\n          \"wi-fi\",\r\n          \"av/projector\",\r\n          \"accessibility\",\r\n          \"power outlets\",\r\n          \"whiteboard\"\r\n        ]\r\n      }\r\n    },\r\n    {\r\n      \"id\": \"step_capacity\",\r\n      \"label\": \"Capacity \\u2265 200  (kept 0/68)\",\r\n      \"group\": \"step\",\r\n      \"val\": 6\r\n    },\r\n    {\r\n      \"id\": \"step_coverage\",\r\n      \"label\": \"Coverage \\u2265 0.6  (kept 15/0)\",\r\n      \"group\": \"step\",\r\n      \"val\": 6\r\n    },\r\n    {\r\n      \"id\": \"step_scoring\",\r\n      \"label\": \"Score = 0.65*Coverage + 0.15*Coverage - 0.20*SlackPenalty\",\r\n      \"group\": \"step\",\r\n      \"val\": 6\r\n    },\r\n    {\r\n      \"id\": \"venue_appleton_tower_lecture_theatre_3\",\r\n      \"label\": \"appleton_tower_lecture_theatre_3 \\u00b7 cap 200 \\u00b7 score 0.38\",\r\n      \"group\": \"best\",\r\n      \"val\": 7,\r\n      \"meta\": {\r\n        \"coverage\": 0.6,\r\n        \"slack\": 0,\r\n        \"matched\": 3\r\n      }\r\n    },\r\n    {\r\n      \"id\": \"venue_appleton_tower_lecture_theatre_3_matched\",\r\n      \"label\": \"Matched amenities\",\r\n      \"group\": \"explain\"\r\n    },\r\n    {\r\n      \"id\": \"venue_appleton_tower_lecture_theatre_3_m_wi-fi\",\r\n      \"label\": \"wi-fi\",\r\n      \"group\": \"amenity\"\r\n    },\r\n    {\r\n      \"id\": \"venue_appleton_tower_lecture_theatre_3_m_av/projector\",\r\n      \"label\": \"av/projector\",\r\n      \"group\": \"amenity\"\r\n    },\r\n    {\r\n      \"id\": \"venue_appleton_tower_lecture_theatre_3_m_accessibility\",\r\n      \"label\": \"accessibility\",\r\n      \"group\": \"amenity\"\r\n    },\r\n    {\r\n      \"id\": \"final\",\r\n      \"label\": \"Selected \\u2192 appleton_tower_lecture_theatre_3\",\r\n      \"group\": \"final\",\r\n      \"val\": 8\r\n    }\r\n  ],\r\n  \"links\": [\r\n    {\r\n      \"source\": \"root\",\r\n      \"target\": \"step_capacity\"\r\n    },\r\n    {\r\n      \"source\": \"step_capacity\",\r\n      \"target\": \"step_coverage\"\r\n    },\r\n    {\r\n      \"source\": \"step_coverage\",\r\n      \"target\": \"step_scoring\"\r\n    },\r\n    {\r\n      \"source\": \"step_scoring\",\r\n      \"target\": \"venue_appleton_tower_lecture_theatre_3\"\r\n    },\r\n    {\r\n      \"source\": \"venue_appleton_tower_lecture_theatre_3\",\r\n      \"target\": \"venue_appleton_tower_lecture_theatre_3_matched\"\r\n    },\r\n    {\r\n      \"source\": \"venue_appleton_tower_lecture_theatre_3_matched\",\r\n      \"target\": \"venue_appleton_tower_lecture_theatre_3_m_wi-fi\"\r\n    },\r\n    {\r\n      \"source\": \"venue_appleton_tower_lecture_theatre_3_matched\",\r\n      \"target\": \"venue_appleton_tower_lecture_theatre_3_m_av/projector\"\r\n    },\r\n    {\r\n      \"source\": \"venue_appleton_tower_lecture_theatre_3_matched\",\r\n      \"target\": \"venue_appleton_tower_lecture_theatre_3_m_accessibility\"\r\n    },\r\n    {\r\n      \"source\": \"venue_appleton_tower_lecture_theatre_3\",\r\n      \"target\": \"final\"\r\n    },\r\n    {\r\n      \"source\": \"final\",\r\n      \"target\": \"root\"\r\n    }\r\n  ],\r\n  \"path\": [\r\n    {\r\n      \"source\": \"root\",\r\n      \"target\": \"step_capacity\"\r\n    },\r\n    {\r\n      \"source\": \"step_capacity\",\r\n      \"target\": \"step_coverage\"\r\n    },\r\n    {\r\n      \"source\": \"step_coverage\",\r\n      \"target\": \"step_scoring\"\r\n    },\r\n    {\r\n      \"source\": \"step_scoring\",\r\n      \"target\": \"venue_appleton_tower_lecture_theatre_3\"\r\n    },\r\n    {\r\n      \"source\": \"venue_appleton_tower_lecture_theatre_3\",\r\n      \"target\": \"final\"\r\n    }\r\n  ],\r\n  \"textInformation\": \"Reasoning: start \\u2192 capacity filter (kept 0/68) \\u2192 coverage \\u2265 0.6 (kept 15/0) \\u2192 score (coverage vs slack) \\u2192 select best.\\nReq amenities: wi-fi, av/projector, accessibility, power outlets, whiteboard.\"\r\n}";
            //String sampleData ="{\n  \"links\": [\n    {\n      \"source\": \"root\",\n      \"target\": \"step_capacity\"\n    },\n    {\n      \"source\": \"step_capacity\",\n      \"target\": \"step_coverage\"\n    },\n    {\n      \"source\": \"step_coverage\",\n      \"target\": \"step_scoring\"\n    },\n    {\n      \"source\": \"step_scoring\",\n      \"target\": \"venue_morningside_sports_grounds_rugby_pitch_1\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_rugby_pitch_1\",\n      \"target\": \"venue_morningside_sports_grounds_rugby_pitch_1_matched\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_rugby_pitch_1_matched\",\n      \"target\": \"venue_morningside_sports_grounds_rugby_pitch_1_m_first aid kit\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_rugby_pitch_1\",\n      \"target\": \"venue_morningside_sports_grounds_rugby_pitch_1_missing\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_rugby_pitch_1_missing\",\n      \"target\": \"venue_morningside_sports_grounds_rugby_pitch_1_x_mats\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_rugby_pitch_1_missing\",\n      \"target\": \"venue_morningside_sports_grounds_rugby_pitch_1_x_ventilation\"\n    },\n    {\n      \"source\": \"step_scoring\",\n      \"target\": \"venue_morningside_sports_grounds_football_pitch_3g\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_football_pitch_3g\",\n      \"target\": \"venue_morningside_sports_grounds_football_pitch_3g_matched\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_football_pitch_3g_matched\",\n      \"target\": \"venue_morningside_sports_grounds_football_pitch_3g_m_first aid kit\"\n    },\n    {\n      \"source\": \"step_scoring\",\n      \"target\": \"venue_morningside_sports_grounds_hockey_pitch_water_based\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_hockey_pitch_water_based\",\n      \"target\": \"venue_morningside_sports_grounds_hockey_pitch_water_based_matched\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_hockey_pitch_water_based_matched\",\n      \"target\": \"venue_morningside_sports_grounds_hockey_pitch_water_based_m_first aid kit\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_rugby_pitch_1\",\n      \"target\": \"final\"\n    },\n    {\n      \"source\": \"final\",\n      \"target\": \"root\"\n    }\n  ],\n  \"nodes\": [\n    {\n      \"group\": \"root\",\n      \"id\": \"root\",\n      \"label\": \"Query\",\n      \"meta\": {\n        \"attendees\": 200,\n        \"min_coverage\": 0.3,\n        \"required\": [\n          \"mats\",\n          \"ventilation\",\n          \"first aid kit\"\n        ]\n      },\n      \"val\": 8\n    },\n    {\n      \"group\": \"step\",\n      \"id\": \"step_capacity\",\n      \"label\": \"Capacity ≥ 200  (kept 0/68)\",\n      \"val\": 6\n    },\n    {\n      \"group\": \"step\",\n      \"id\": \"step_coverage\",\n      \"label\": \"Coverage ≥ 0.3  (kept 15/0)\",\n      \"val\": 6\n    },\n    {\n      \"group\": \"step\",\n      \"id\": \"step_scoring\",\n      \"label\": \"Score = 0.65*Coverage + 0.15*Coverage - 0.20*SlackPenalty\",\n      \"val\": 6\n    },\n    {\n      \"group\": \"best\",\n      \"id\": \"venue_morningside_sports_grounds_rugby_pitch_1\",\n      \"label\": \"rugby pitch 1 · cap 200 · score 0.167\",\n      \"meta\": {\n        \"capacity\": 200,\n        \"coverage\": 0.333,\n        \"matched\": 1,\n        \"score\": 0.167,\n        \"slack\": 0\n      },\n      \"val\": 7\n    },\n    {\n      \"group\": \"explain\",\n      \"id\": \"venue_morningside_sports_grounds_rugby_pitch_1_matched\",\n      \"label\": \"Matched amenities\"\n    },\n    {\n      \"group\": \"amenity\",\n      \"id\": \"venue_morningside_sports_grounds_rugby_pitch_1_m_first aid kit\",\n      \"label\": \"first aid kit\"\n    },\n    {\n      \"group\": \"explain\",\n      \"id\": \"venue_morningside_sports_grounds_rugby_pitch_1_missing\",\n      \"label\": \"Missing amenities\"\n    },\n    {\n      \"group\": \"amenity_missing\",\n      \"id\": \"venue_morningside_sports_grounds_rugby_pitch_1_x_mats\",\n      \"label\": \"mats\"\n    },\n    {\n      \"group\": \"amenity_missing\",\n      \"id\": \"venue_morningside_sports_grounds_rugby_pitch_1_x_ventilation\",\n      \"label\": \"ventilation\"\n    },\n    {\n      \"group\": \"shortlist\",\n      \"id\": \"venue_morningside_sports_grounds_football_pitch_3g\",\n      \"label\": \"football pitch (3g) · cap 800 · score 0.067\",\n      \"meta\": {\n        \"capacity\": 800,\n        \"coverage\": 0.333,\n        \"matched\": 1,\n        \"score\": 0.067,\n        \"slack\": 600\n      },\n      \"val\": 4\n    },\n    {\n      \"group\": \"explain\",\n      \"id\": \"venue_morningside_sports_grounds_football_pitch_3g_matched\",\n      \"label\": \"Matched amenities\"\n    },\n    {\n      \"group\": \"amenity\",\n      \"id\": \"venue_morningside_sports_grounds_football_pitch_3g_m_first aid kit\",\n      \"label\": \"first aid kit\"\n    },\n    {\n      \"group\": \"shortlist\",\n      \"id\": \"venue_morningside_sports_grounds_hockey_pitch_water_based\",\n      \"label\": \"hockey pitch (water-based) · cap 800 · score 0.067\",\n      \"meta\": {\n        \"capacity\": 800,\n        \"coverage\": 0.333,\n        \"matched\": 1,\n        \"score\": 0.067,\n        \"slack\": 600\n      },\n      \"val\": 4\n    },\n    {\n      \"group\": \"explain\",\n      \"id\": \"venue_morningside_sports_grounds_hockey_pitch_water_based_matched\",\n      \"label\": \"Matched amenities\"\n    },\n    {\n      \"group\": \"amenity\",\n      \"id\": \"venue_morningside_sports_grounds_hockey_pitch_water_based_m_first aid kit\",\n      \"label\": \"first aid kit\"\n    },\n    {\n      \"group\": \"final\",\n      \"id\": \"final\",\n      \"label\": \"Selected → rugby pitch 1 · score 0.167\",\n      \"val\": 8\n    }\n  ],\n  \"path\": [\n    {\n      \"source\": \"root\",\n      \"target\": \"step_capacity\"\n    },\n    {\n      \"source\": \"step_capacity\",\n      \"target\": \"step_coverage\"\n    },\n    {\n      \"source\": \"step_coverage\",\n      \"target\": \"step_scoring\"\n    },\n    {\n      \"source\": \"step_scoring\",\n      \"target\": \"venue_morningside_sports_grounds_rugby_pitch_1\"\n    },\n    {\n      \"source\": \"venue_morningside_sports_grounds_rugby_pitch_1\",\n      \"target\": \"final\"\n    }\n  ],\n  \"textInformation\": \"Reasoning: start → capacity filter (kept 0/68) → coverage ≥ 0.3 (kept 15/0) → score (coverage vs slack) → select best.\\nReq amenities: mats, ventilation, first aid kit.\"\n}";
            String suggestedVenuesJson = "[\n" +
                    "  {\"venue\": \"appleton_tower_lecture_theatre_3\", \"id\": \"appleton_tower_lecture_theatre_3\", \"capacity\": 200, \"amenities\": [\"wi-fi\", \"av/projector\", \"accessibility\"], \"matched\": 3, \"coverage\": 0.6, \"amenity_score\": 0.6, \"slack\": 0, \"score\": 0.38},\n" +
                    "  {\"venue\": \"reid concert hall\", \"id\": \"reid_concert_hall_reid_concert_hall\", \"capacity\": 220, \"amenities\": [\"wi-fi\", \"av/projector\", \"accessibility\"], \"matched\": 3, \"coverage\": 0.6, \"amenity_score\": 0.6, \"slack\": 20, \"score\": 0.289},\n" +
                    "  {\"venue\": \"lecture theatre g.03\", \"id\": \"50_george_square_lecture_theatre_g_03\", \"capacity\": 255, \"amenities\": [\"wi-fi\", \"av/projector\", \"accessibility\"], \"matched\": 3, \"coverage\": 0.6, \"amenity_score\": 0.6, \"slack\": 55, \"score\": 0.28}\n" +
                    "]";            ObjectMapper mapper = new ObjectMapper();
            //Map<String, Object> extractedData = mapper.readValue(sampleData, Map.class);
            List<Map<String, Object>> suggestedVenues = mapper.readValue(suggestedVenuesJson, List.class);
            extractedData.put("suggestedVenues", suggestedVenues);
            
            if (extractedData != null && !extractedData.isEmpty()) {
                System.out.println("Returning extracted data: " + extractedData);
                return extractedData;
            }
            
            return Map.of("error", "Failed to extract data from remote API.");
            
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("error", "Error processing query: " + e.getMessage());
        }
    }
    
    /**
     * Calls the remote extraction API to process the query.
     * 
     * @param query The user's query string
     * @return Map containing extracted event information
     */
    private Map<String, Object> callExtractionAPI(String query) {
        try {
            Map<String, String> requestBody = Map.of("query", query);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(requestBody, headers);
            
            System.out.println("Calling extraction API: " + EXTRACTION_API_URL);
            System.out.println("Request body: " + requestBody);
            
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                EXTRACTION_API_URL,
                HttpMethod.POST,
                requestEntity,
                (Class<Map<String, Object>>) (Class<?>) Map.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                System.out.println("API response: " + responseBody);
                return responseBody;
            } else {
                System.err.println("API call failed with status: " + response.getStatusCode());
                return Map.of("error", "API call failed with status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            System.err.println("Error calling extraction API: " + e.getMessage());
            e.printStackTrace();
            return Map.of("error", "Error calling extraction API: " + e.getMessage());
        }
    }
    
    /**
     * Handles venue booking request.
     * Receives booking data including venue information, amenities, and date/time.
     * 
     * @param bookingPayload Map containing booking information
     * @return Map with booking confirmation or error message
     */
    @PostMapping("/booking")
    public Map<String, Object> booking(@RequestBody Map<String, Object> bookingPayload) {
        try {
            System.out.println("Received booking request: " + bookingPayload);
            
            String venueId = (String) bookingPayload.getOrDefault("venueId", "");
            String venueName = (String) bookingPayload.getOrDefault("venueName", "");
            String venueGroup = (String) bookingPayload.getOrDefault("venueGroup", "");
            
            @SuppressWarnings("unchecked")
            Map<String, Object> venueMeta = (Map<String, Object>) bookingPayload.getOrDefault("venueMeta", Map.of());
            Integer capacity = venueMeta.get("capacity") != null ? 
                (venueMeta.get("capacity") instanceof Integer ? (Integer) venueMeta.get("capacity") : 
                 (venueMeta.get("capacity") instanceof Double ? ((Double) venueMeta.get("capacity")).intValue() : null)) : null;
            Double coverage = venueMeta.get("coverage") != null ? 
                (venueMeta.get("coverage") instanceof Double ? (Double) venueMeta.get("coverage") : 
                 (venueMeta.get("coverage") instanceof Number ? ((Number) venueMeta.get("coverage")).doubleValue() : null)) : null;
            Integer slack = venueMeta.get("slack") != null ? 
                (venueMeta.get("slack") instanceof Integer ? (Integer) venueMeta.get("slack") : 
                 (venueMeta.get("slack") instanceof Double ? ((Double) venueMeta.get("slack")).intValue() : null)) : null;
            Integer matched = venueMeta.get("matched") != null ? 
                (venueMeta.get("matched") instanceof Integer ? (Integer) venueMeta.get("matched") : 
                 (venueMeta.get("matched") instanceof Double ? ((Double) venueMeta.get("matched")).intValue() : null)) : null;
            Double score = venueMeta.get("score") != null ? 
                (venueMeta.get("score") instanceof Double ? (Double) venueMeta.get("score") : 
                 (venueMeta.get("score") instanceof Number ? ((Number) venueMeta.get("score")).doubleValue() : null)) : null;
            
            Double venueScore = bookingPayload.get("score") != null ? 
                (bookingPayload.get("score") instanceof Double ? (Double) bookingPayload.get("score") : 
                 (bookingPayload.get("score") instanceof Number ? ((Number) bookingPayload.get("score")).doubleValue() : null)) : null;
            
            String eventName = (String) bookingPayload.getOrDefault("eventName", "");
            String eventDescription = (String) bookingPayload.getOrDefault("eventDescription", null);
            
            @SuppressWarnings("unchecked")
            List<String> guaranteedAmenities = (List<String>) bookingPayload.getOrDefault("guaranteedAmenities", List.of());
            @SuppressWarnings("unchecked")
            List<String> potentialAmenities = (List<String>) bookingPayload.getOrDefault("potentialAmenities", List.of());
            @SuppressWarnings("unchecked")
            List<String> allAmenities = (List<String>) bookingPayload.getOrDefault("allAmenities", List.of());
            
            String dateFrom = (String) bookingPayload.getOrDefault("dateFrom", "");
            String dateTo = (String) bookingPayload.getOrDefault("dateTo", "");
            String timeFrom = (String) bookingPayload.getOrDefault("timeFrom", "");
            String timeTo = (String) bookingPayload.getOrDefault("timeTo", "");
            
            @SuppressWarnings("unchecked")
            List<String> emails = (List<String>) bookingPayload.getOrDefault("emails", List.of());
            Integer emailCount = bookingPayload.get("emailCount") != null ? 
                (bookingPayload.get("emailCount") instanceof Integer ? (Integer) bookingPayload.get("emailCount") : 
                 (bookingPayload.get("emailCount") instanceof Double ? ((Double) bookingPayload.get("emailCount")).intValue() : 0)) : 0;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> venueData = (Map<String, Object>) bookingPayload.getOrDefault("venueData", Map.of());
            
            System.out.println("=== BOOKING DATA PARSED ===");
            System.out.println("Event Name: " + (eventName != null && !eventName.isEmpty() ? eventName : "N/A"));
            System.out.println("Event Description: " + (eventDescription != null && !eventDescription.isEmpty() ? eventDescription : "N/A"));
            System.out.println("Venue ID: " + venueId);
            System.out.println("Venue Name: " + venueName);
            System.out.println("Venue Group: " + (venueGroup != null && !venueGroup.isEmpty() ? venueGroup : "N/A"));
            System.out.println("Capacity: " + (capacity != null ? capacity : "N/A"));
            System.out.println("Coverage: " + (coverage != null ? coverage : "N/A"));
            System.out.println("Slack: " + (slack != null ? slack : "N/A"));
            System.out.println("Matched: " + (matched != null ? matched : "N/A"));
            System.out.println("Score: " + (venueScore != null ? venueScore : (score != null ? score : "N/A")));
            System.out.println("Guaranteed Amenities: " + guaranteedAmenities);
            System.out.println("Potential Amenities: " + potentialAmenities);
            System.out.println("All Amenities: " + allAmenities);
            System.out.println("Date From: " + dateFrom);
            System.out.println("Date To: " + dateTo);
            System.out.println("Time From: " + timeFrom);
            System.out.println("Time To: " + timeTo);
            System.out.println("Email Count: " + emailCount);
            System.out.println("Emails: " + emails);
            System.out.println("===========================");
            
            System.out.println(">>> CALLING checkForClashes for venue: " + venueId);
            System.out.println(">>> Dates: " + dateFrom + " to " + dateTo);
            System.out.println(">>> Times: " + timeFrom + " to " + timeTo);
            
            Map<String, Object> clashCheck = bookingService.checkForClashes(
                venueId, dateFrom, dateTo, timeFrom, timeTo);
            
            System.out.println(">>> Clash check result: " + clashCheck);
            Boolean hasClash = (Boolean) clashCheck.getOrDefault("hasClash", false);
            System.out.println(">>> Has clash: " + hasClash);
            
            if (hasClash) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> clashingBookings = 
                    (List<Map<String, Object>>) clashCheck.getOrDefault("clashingBookings", List.of());
                
                Map<String, Object> errorResponse = new java.util.HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("hasClash", true);
                errorResponse.put("error", "Booking conflict detected. The venue is already booked during the requested time.");
                errorResponse.put("clashingBookings", clashingBookings);
                
                System.out.println("Booking clash detected for venue: " + venueId);
                System.out.println("Clashing bookings: " + clashingBookings.size());
                
                return errorResponse;
            }
            
            Map<String, Object> bookingToSave = new java.util.HashMap<>();
            bookingToSave.put("venueId", venueId);
            bookingToSave.put("venueName", venueName);
            bookingToSave.put("venueGroup", venueGroup);
            bookingToSave.put("eventName", eventName);
            bookingToSave.put("eventDescription", eventDescription);
            bookingToSave.put("dateFrom", dateFrom);
            bookingToSave.put("dateTo", dateTo);
            bookingToSave.put("timeFrom", timeFrom);
            bookingToSave.put("timeTo", timeTo);
            bookingToSave.put("capacity", capacity);
            bookingToSave.put("coverage", coverage);
            bookingToSave.put("score", venueScore != null ? venueScore : score);
            bookingToSave.put("emails", emails);
            bookingToSave.put("emailCount", emailCount);
            bookingToSave.put("guaranteedAmenities", guaranteedAmenities);
            bookingToSave.put("potentialAmenities", potentialAmenities);
            
            bookingService.saveBooking(bookingToSave);
            System.out.println("Booking saved successfully for venue: " + venueId);
            
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("success", true);
            response.put("hasClash", false);
            response.put("message", "Booking received successfully");
            response.put("eventName", eventName != null && !eventName.isEmpty() ? eventName : null);
            response.put("eventDescription", eventDescription != null && !eventDescription.isEmpty() ? eventDescription : null);
            response.put("venueId", venueId);
            response.put("venueName", venueName);
            response.put("bookingDates", Map.of(
                "from", dateFrom,
                "to", dateTo
            ));
            response.put("bookingTimes", Map.of(
                "from", timeFrom,
                "to", timeTo
            ));
            
            Map<String, Object> parsedData = new java.util.HashMap<>();
            parsedData.put("eventName", eventName != null && !eventName.isEmpty() ? eventName : "");
            parsedData.put("eventDescription", eventDescription != null && !eventDescription.isEmpty() ? eventDescription : "");
            parsedData.put("venueGroup", venueGroup != null && !venueGroup.isEmpty() ? venueGroup : "");
            parsedData.put("capacity", capacity != null ? capacity : 0);
            parsedData.put("coverage", coverage != null ? coverage : 0.0);
            parsedData.put("slack", slack != null ? slack : 0);
            parsedData.put("matched", matched != null ? matched : 0);
            parsedData.put("score", venueScore != null ? venueScore : (score != null ? score : 0.0));
            parsedData.put("guaranteedAmenitiesCount", guaranteedAmenities.size());
            parsedData.put("potentialAmenitiesCount", potentialAmenities.size());
            parsedData.put("allAmenitiesCount", allAmenities.size());
            parsedData.put("emailCount", emailCount);
            parsedData.put("emails", emails);
            
            response.put("parsedData", parsedData);
            
            return response;
            
        } catch (Exception e) {
            System.err.println("Error processing booking: " + e.getMessage());
            e.printStackTrace();
            return Map.of("success", false, "error", "Error processing booking: " + e.getMessage());
        }
    }
    
    /**
     * Handles email sending request for event notifications.
     * Receives event information and recipient email list.
     * 
     * @param emailPayload Map containing event_info, timezone, and recipients
     * @return Map with success confirmation or error message
     */
    @PostMapping("/send-email")
    public Map<String, Object> sendEmail(@RequestBody Map<String, Object> emailPayload) {
        try {
            System.out.println("Received email request: " + emailPayload);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> eventInfo = (Map<String, Object>) emailPayload.getOrDefault("event_info", Map.of());
            
            String eventName = (String) eventInfo.getOrDefault("name", "");
            String eventDate = (String) eventInfo.getOrDefault("date", "");
            String eventTime = (String) eventInfo.getOrDefault("time", "");
            String location = (String) eventInfo.getOrDefault("location", "");
            Integer durationMinutes = eventInfo.get("duration_minutes") != null ? 
                (eventInfo.get("duration_minutes") instanceof Integer ? (Integer) eventInfo.get("duration_minutes") : 
                 (eventInfo.get("duration_minutes") instanceof Double ? ((Double) eventInfo.get("duration_minutes")).intValue() : null)) : null;
            String description = (String) eventInfo.getOrDefault("description", "");
            
            String timezone = (String) emailPayload.getOrDefault("timezone", "");
            
            @SuppressWarnings("unchecked")
            List<String> recipients = (List<String>) emailPayload.getOrDefault("recipients", List.of());
            
            System.out.println("=== EMAIL DATA PARSED ===");
            System.out.println("Event Name: " + eventName);
            System.out.println("Event Date: " + eventDate);
            System.out.println("Event Time: " + eventTime);
            System.out.println("Location: " + location);
            System.out.println("Duration (minutes): " + durationMinutes);
            System.out.println("Description: " + description);
            System.out.println("Timezone: " + timezone);
            System.out.println("Recipients: " + recipients);
            System.out.println("Recipient Count: " + recipients.size());
            System.out.println("=========================");
            
            Map<String, Object> apiResponse = callEmailAPI(emailPayload);
            
            return apiResponse;
            
                } catch (Exception e) {
            System.err.println("Error processing email request: " + e.getMessage());
            e.printStackTrace();
            return Map.of("success", false, "error", "Error processing email request: " + e.getMessage());
        }
    }
    
    /**
     * Calls the external email API to send invitation emails.
     * 
     * @param emailPayload The email payload containing event_info, timezone, and recipients
     * @return Map containing the API response with success status and email results
     */
    private Map<String, Object> callEmailAPI(Map<String, Object> emailPayload) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(emailPayload, headers);
            
            System.out.println("Calling email API: " + EMAIL_API_URL);
            System.out.println("Request body: " + emailPayload);
            
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                EMAIL_API_URL,
                HttpMethod.POST,
                requestEntity,
                (Class<Map<String, Object>>) (Class<?>) Map.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                System.out.println("Email API response: " + responseBody);
                return responseBody;
            } else {
                System.err.println("Email API call failed with status: " + response.getStatusCode());
                return Map.of("success", false, "error", "Email API call failed with status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            System.err.println("Error calling email API: " + e.getMessage());
            e.printStackTrace();
            return Map.of("success", false, "error", "Error calling email API: " + e.getMessage());
        }
    }
}
