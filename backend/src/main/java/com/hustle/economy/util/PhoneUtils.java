package com.hustle.economy.util;

public class PhoneUtils {

    /**
     * Normalises South African phone numbers to local 10-digit format (0XXXXXXXXX).
     * Handles: +27XXXXXXXXX → 0XXXXXXXXX, 27XXXXXXXXX → 0XXXXXXXXX, strips spaces/dashes.
     */
    public static String normalize(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("[\\s\\-()]", "");
        if (digits.startsWith("+27")) return "0" + digits.substring(3);
        if (digits.startsWith("27") && digits.length() == 11) return "0" + digits.substring(2);
        return digits;
    }
}
