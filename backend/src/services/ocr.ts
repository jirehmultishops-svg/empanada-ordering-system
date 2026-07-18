import db from '../db/connection.js';
import { NotificationService } from './notifications.js';

/**
 * OCRService - Processes receipt images and extracts payment amounts.
 *
 * This is a placeholder implementation. The extractAmount function returns null
 * by default (simulating OCR failure → manual_review). To swap in a real OCR
 * provider (Tesseract, Google Vision, etc.), replace the extractAmount function.
 */

export interface OCRResult {
  success: boolean;
  amount: number | null;
}

/**
 * Attempts to extract a monetary amount from a receipt image.
 * Placeholder: always returns null (OCR failure), triggering manual review.
 * Replace this with actual OCR logic (Tesseract, Cloud Vision API, etc.)
 */
export async function extractAmount(_imagePath: string): Promise<OCRResult> {
  // Placeholder implementation - simulates OCR failure
  // In production, this would call an OCR engine:
  //   const text = await tesseract.recognize(imagePath);
  //   const amount = parseAmountFromText(text);
  //   return { success: amount !== null, amount };
  return { success: false, amount: null };
}

/**
 * Processes a receipt: extracts the amount via OCR and compares with the order total.
 *
 * Outcomes:
 * - OCR succeeds & amounts match → ocr_status='completed', verified=true
 * - OCR succeeds & amounts differ → ocr_status='completed', verified=false
 * - OCR fails → ocr_status='manual_review'
 */
export async function processReceipt(receiptId: string): Promise<void> {
  try {
    // Read the receipt record and associated order
    const receipt = await db('receipt').where({ id: receiptId }).first();
    if (!receipt) {
      console.error(`OCR: Receipt ${receiptId} not found`);
      return;
    }

    const order = await db('order').where({ id: receipt.order_id }).first();
    if (!order) {
      console.error(`OCR: Order ${receipt.order_id} not found for receipt ${receiptId}`);
      await db('receipt').where({ id: receiptId }).update({ ocr_status: 'manual_review' });
      return;
    }

    // Attempt to extract amount from the image
    const result = await extractAmount(receipt.image_url);

    if (result.success && result.amount !== null) {
      // Compare extracted amount with order total
      const orderTotal = parseFloat(order.total_amount);
      const extractedAmount = result.amount;
      const amountsMatch = Math.abs(extractedAmount - orderTotal) < 0.01;

      await db('receipt').where({ id: receiptId }).update({
        extracted_amount: extractedAmount,
        ocr_status: 'completed',
        verified: amountsMatch,
      });

      // If amounts don't match, notify admin of discrepancy
      if (!amountsMatch) {
        try {
          await NotificationService.notifyAdmins(
            'ocr_discrepancy',
            `Discrepancia en comprobante: monto extraído $${extractedAmount}, monto pedido $${orderTotal}`,
            {
              receipt_id: receiptId,
              order_id: order.id,
              extracted_amount: extractedAmount,
              order_total: orderTotal,
            }
          );
        } catch (notifyError) {
          console.error('Error notifying admin about OCR discrepancy:', notifyError);
        }
      }
    } else {
      // OCR failed - mark for manual review
      await db('receipt').where({ id: receiptId }).update({
        ocr_status: 'manual_review',
      });

      // Notify admin that manual review is needed
      try {
        await NotificationService.notifyAdmins(
          'manual_review_required',
          'Un comprobante requiere revisión manual (OCR no pudo leer la imagen)',
          { receipt_id: receiptId, order_id: order.id }
        );
      } catch (notifyError) {
        console.error('Error notifying admin about manual review:', notifyError);
      }
    }
  } catch (error) {
    console.error(`OCR: Error processing receipt ${receiptId}:`, error);
    // On unexpected errors, mark for manual review
    try {
      await db('receipt').where({ id: receiptId }).update({
        ocr_status: 'manual_review',
      });
    } catch (updateError) {
      console.error(`OCR: Failed to update receipt ${receiptId} status:`, updateError);
    }
  }
}

export const OCRService = {
  processReceipt,
  extractAmount,
};

export default OCRService;
