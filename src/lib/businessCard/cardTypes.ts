export type BusinessCardData = {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
    designation?: string;
    address?: string;
    website?: string;
};

export type CardScanResult = {
    success: boolean;
    rawText?: string;
    data?: BusinessCardData;
    error?: string;
};
