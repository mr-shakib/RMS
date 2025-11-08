/**
 * Manual test file for QR code generation
 * This is not an automated test, but a reference for testing the QR code functionality
 */

import { generateTableQRCode, generateTableQRCodeBuffer, generateTableQRCodePDF } from '../qrCodeGenerator';

// Example usage:
// 
// Test 1: Generate QR code as data URL
// const qrDataUrl = await generateTableQRCode(1, 'http://192.168.1.100:5000');
// console.log('QR Data URL:', qrDataUrl);
//
// Test 2: Generate QR code as buffer
// const qrBuffer = await generateTableQRCodeBuffer(1, 'http://192.168.1.100:5000');
// console.log('QR Buffer length:', qrBuffer.length);
//
// Test 3: Generate QR code PDF
// const pdfBuffer = await generateTableQRCodePDF(1, 'Table 1', 'http://192.168.1.100:5000');
// console.log('PDF Buffer length:', pdfBuffer.length);

export {};
