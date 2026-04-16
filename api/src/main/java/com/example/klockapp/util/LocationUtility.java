package com.example.klockapp.util;

public class LocationUtility {

    private static final double EARTH_RADIUS = 6371e3; // Earth radius in meters

    /**
     * Haversine formula to check if user coordinates are within branch radius.
     */
    public static boolean isWithinRadius(
            double userLat, double userLng,
            double branchLat, double branchLng,
            double radius) {

        double dLat = Math.toRadians(branchLat - userLat);
        double dLng = Math.toRadians(branchLng - userLng);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(userLat)) * Math.cos(Math.toRadians(branchLat)) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = EARTH_RADIUS * c;

        return distance <= radius;
    }
}
