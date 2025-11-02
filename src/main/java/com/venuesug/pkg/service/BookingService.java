package com.venuesug.pkg.service;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class BookingService {
    
    private static final String BOOKINGS_FILE = "bookings.json";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    
    private final ObjectMapper objectMapper;
    
    public BookingService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.findAndRegisterModules();
    }
    
    /**
     * Get the bookings file path in resources directory
     * Uses src/main/resources for development and user.dir for production
     */
    private Path getBookingsFilePath() {
        try {
            Path bookingsPath;
            
            Path resourcesPath = Paths.get(System.getProperty("user.dir"), "src", "main", "resources", BOOKINGS_FILE);
            
            System.out.println("Checking bookings file path - user.dir: " + System.getProperty("user.dir"));
            System.out.println("Resources path: " + resourcesPath.toAbsolutePath());
            System.out.println("Resources parent exists: " + Files.exists(resourcesPath.getParent()));
            System.out.println("Resources parent writable: " + (Files.exists(resourcesPath.getParent()) ? Files.isWritable(resourcesPath.getParent()) : "N/A"));
            
            if (Files.exists(resourcesPath.getParent()) && Files.isWritable(resourcesPath.getParent())) {
                bookingsPath = resourcesPath;
                System.out.println("Using resources directory: " + bookingsPath.toAbsolutePath());
            } else {
                bookingsPath = Paths.get(System.getProperty("user.dir"), BOOKINGS_FILE);
                System.out.println("Using project root (fallback): " + bookingsPath.toAbsolutePath());
            }
            
            if (!Files.exists(bookingsPath)) {
                System.out.println("Creating new bookings file: " + bookingsPath.toAbsolutePath());
                Files.createDirectories(bookingsPath.getParent());
                Files.createFile(bookingsPath);
                try (FileWriter writer = new FileWriter(bookingsPath.toFile())) {
                    writer.write("[]");
                }
                System.out.println("Initialized bookings file with empty array");
            }
            
            return bookingsPath;
        } catch (Exception e) {
            System.err.println("Error getting bookings file path: " + e.getMessage());
            e.printStackTrace();
            Path fallbackPath = Paths.get(System.getProperty("user.dir"), BOOKINGS_FILE);
            System.out.println("Using fallback path: " + fallbackPath.toAbsolutePath());
            return fallbackPath;
        }
    }
    
    /**
     * Load all bookings from the JSON file
     */
    private List<Map<String, Object>> loadBookings() {
        Path bookingsPath = getBookingsFilePath();
        List<Map<String, Object>> bookings = new ArrayList<>();
        
        System.out.println("Loading bookings from: " + bookingsPath.toAbsolutePath());
        
        try {
            File bookingsFile = bookingsPath.toFile();
            System.out.println("File exists: " + bookingsFile.exists() + ", Size: " + bookingsFile.length());
            
            if (bookingsFile.exists() && bookingsFile.length() > 0) {
                bookings = objectMapper.readValue(bookingsFile, 
                    new TypeReference<List<Map<String, Object>>>() {});
                
                if (bookings == null) {
                    bookings = new ArrayList<>();
                }
                
                System.out.println("Loaded " + bookings.size() + " booking(s) from file");
            } else {
                System.out.println("No bookings file found or file is empty");
            }
        } catch (IOException e) {
            System.err.println("Error reading bookings file: " + e.getMessage());
            e.printStackTrace();
            bookings = new ArrayList<>();
        }
        
        return bookings;
    }
    
    /**
     * Save all bookings to the JSON file
     */
    private void saveBookings(List<Map<String, Object>> bookings) {
        Path bookingsPath = getBookingsFilePath();
        
        System.out.println("Saving " + bookings.size() + " booking(s) to: " + bookingsPath.toAbsolutePath());
        
        try {
            objectMapper.writerWithDefaultPrettyPrinter()
                .writeValue(bookingsPath.toFile(), bookings);
            System.out.println("Successfully saved bookings to file");
        } catch (IOException e) {
            System.err.println("Error writing bookings file: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to save bookings", e);
        }
    }
    
    /**
     * Parse date and time strings to LocalDateTime
     */
    private LocalDateTime parseDateTime(String dateStr, String timeStr) {
        try {
            LocalDate date = LocalDate.parse(dateStr, DATE_FORMATTER);
            LocalTime time = LocalTime.parse(timeStr, TIME_FORMATTER);
            return LocalDateTime.of(date, time);
        } catch (DateTimeParseException e) {
            System.err.println("Error parsing date/time: " + dateStr + " " + timeStr);
            return null;
        }
    }
    
    /**
     * Check if two time ranges overlap
     * Two ranges overlap if they share any common time point.
     * This includes:
     * - Partial overlaps (one starts before the other ends)
     * - Exact matches (same start/end times)
     * - One range completely contains the other
     */
    private boolean isOverlapping(LocalDateTime start1, LocalDateTime end1, 
                                   LocalDateTime start2, LocalDateTime end2) {
        return !start1.isAfter(end2) && !start2.isAfter(end1);
    }
    
    /**
     * Remove expired bookings (where end date/time is before current time)
     */
    public void removeExpiredBookings() {
        List<Map<String, Object>> bookings = loadBookings();
        LocalDateTime now = LocalDateTime.now();
        
        List<Map<String, Object>> activeBookings = new ArrayList<>();
        
        for (Map<String, Object> booking : bookings) {
            try {
                String dateTo = (String) booking.get("dateTo");
                String timeTo = (String) booking.get("timeTo");
                
                if (dateTo != null && timeTo != null) {
                    LocalDateTime endDateTime = parseDateTime(dateTo, timeTo);
                    
                    if (endDateTime != null && endDateTime.isAfter(now)) {
                        activeBookings.add(booking);
                    } else {
                        System.out.println("Removing expired booking: " + booking.get("eventName") + 
                                         " at " + booking.get("venueName"));
                    }
                } else {
                    activeBookings.add(booking);
                }
            } catch (Exception e) {
                System.err.println("Error processing booking for expiration check: " + e.getMessage());
                if (!activeBookings.contains(booking)) {
                    activeBookings.add(booking);
                }
            }
        }
        
        if (activeBookings.size() != bookings.size()) {
            saveBookings(activeBookings);
            System.out.println("Removed " + (bookings.size() - activeBookings.size()) + " expired booking(s)");
        }
    }
    
    /**
     * Check for booking clashes at the same venue
     */
    public Map<String, Object> checkForClashes(String venueId, String dateFrom, String dateTo, 
                                                String timeFrom, String timeTo) {
        removeExpiredBookings();
        
        List<Map<String, Object>> bookings = loadBookings();
        LocalDateTime newStart = parseDateTime(dateFrom, timeFrom);
        LocalDateTime newEnd = parseDateTime(dateTo, timeTo);
        
        System.out.println("=== CHECKING FOR CLASHES ===");
        System.out.println("Venue ID: " + venueId);
        System.out.println("New booking: " + dateFrom + " " + timeFrom + " to " + dateTo + " " + timeTo);
        System.out.println("Parsed as: " + newStart + " to " + newEnd);
        System.out.println("Total existing bookings: " + bookings.size());
        
        if (newStart == null || newEnd == null) {
            System.out.println("ERROR: Invalid date/time format - newStart: " + newStart + ", newEnd: " + newEnd);
            return Map.of("hasClash", false, "error", "Invalid date/time format");
        }
        
        List<Map<String, Object>> clashingBookings = new ArrayList<>();
        
        for (Map<String, Object> booking : bookings) {
            try {
                String existingVenueId = (String) booking.get("venueId");
                
                System.out.println("Checking booking - Venue ID: " + existingVenueId + 
                                 ", Event: " + booking.get("eventName"));
                
                if (venueId != null && venueId.equals(existingVenueId)) {
                    String existingDateFrom = (String) booking.get("dateFrom");
                    String existingDateTo = (String) booking.get("dateTo");
                    String existingTimeFrom = (String) booking.get("timeFrom");
                    String existingTimeTo = (String) booking.get("timeTo");
                    
                    System.out.println("  Same venue found - Checking dates: " + 
                                     existingDateFrom + " " + existingTimeFrom + 
                                     " to " + existingDateTo + " " + existingTimeTo);
                    
                    if (existingDateFrom != null && existingTimeFrom != null &&
                        existingDateTo != null && existingTimeTo != null) {
                        
                        LocalDateTime existingStart = parseDateTime(existingDateFrom, existingTimeFrom);
                        LocalDateTime existingEnd = parseDateTime(existingDateTo, existingTimeTo);
                        
                        System.out.println("  Parsed as: " + existingStart + " to " + existingEnd);
                        
                        if (existingStart != null && existingEnd != null) {
                            boolean overlaps = isOverlapping(newStart, newEnd, existingStart, existingEnd);
                            System.out.println("  Overlaps? " + overlaps);
                            if (overlaps) {
                                System.out.println("  *** CLASH DETECTED ***");
                                clashingBookings.add(booking);
                            }
                        } else {
                            System.out.println("  ERROR: Could not parse existing booking dates");
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Error checking booking for clash: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        System.out.println("Total clashing bookings: " + clashingBookings.size());
        System.out.println("===========================");
        
        Map<String, Object> result = new HashMap<>();
        result.put("hasClash", !clashingBookings.isEmpty());
        
        if (!clashingBookings.isEmpty()) {
            List<Map<String, Object>> clashInfo = new ArrayList<>();
            for (Map<String, Object> clash : clashingBookings) {
                Map<String, Object> info = new HashMap<>();
                info.put("eventName", clash.getOrDefault("eventName", "Unknown Event"));
                info.put("dateFrom", clash.getOrDefault("dateFrom", ""));
                info.put("dateTo", clash.getOrDefault("dateTo", ""));
                info.put("timeFrom", clash.getOrDefault("timeFrom", ""));
                info.put("timeTo", clash.getOrDefault("timeTo", ""));
                clashInfo.add(info);
            }
            result.put("clashingBookings", clashInfo);
        }
        
        return result;
    }
    
    /**
     * Save a new booking to the file
     */
    public void saveBooking(Map<String, Object> bookingData) {
        removeExpiredBookings();
        
        List<Map<String, Object>> bookings = loadBookings();
        
        Map<String, Object> newBooking = new HashMap<>(bookingData);
        newBooking.put("bookingId", System.currentTimeMillis() + "-" + 
                      bookingData.getOrDefault("venueId", "unknown"));
        newBooking.put("createdAt", LocalDateTime.now().toString());
        
        bookings.add(newBooking);
        saveBookings(bookings);
        
        System.out.println("Saved new booking: " + bookingData.get("eventName") + 
                         " at " + bookingData.get("venueName"));
    }
    
    /**
     * Get all bookings (for debugging/admin purposes)
     */
    public List<Map<String, Object>> getAllBookings() {
        removeExpiredBookings();
        return loadBookings();
    }
}

