# PWA Italian Localization Plan

## Overview
Convert the PWA to Italian as the primary language for Italian restaurant customers.

## Progress Tracking

### Phase 1: Text Content Translation ✅
- [x] Menu page (`src/menuPage.ts`)
  - [x] Page titles and headers
  - [x] Category labels ("Tutti" for All)
  - [x] Search placeholder ("Cerca nel menu...")
  - [x] Button text (Aggiungi, Vedi Carrello)
  - [x] Empty state messages
  - [x] Price formatting (€ with comma decimal)
- [x] Cart page (`src/cartPage.ts`)
  - [x] Page title ("Il Tuo Carrello")
  - [x] Item labels (Quantità, Prezzo, Subtotale)
  - [x] Special instructions placeholder
  - [x] Button text (Invia Ordine, Torna al Menu)
  - [x] Empty cart message
  - [x] Total/Tax labels
- [ ] Status page (`src/statusPage.ts`)
  - [ ] Page title
  - [ ] Order status labels (Pending, Preparing, Ready, Delivered)
  - [ ] Order details labels
  - [ ] Time stamps
  - [ ] Button text (Back to Menu)
  - [ ] Empty state messages
- [ ] Network indicator (`src/networkIndicator.ts`)
  - [ ] Online/Offline messages
  - [ ] Connection status text
- [ ] Error messages (all files)
  - [ ] API error messages
  - [ ] Validation messages
  - [ ] Network error messages

### Phase 2: Date/Time Formatting ⏳
- [ ] Update time display to Italian format
- [ ] Update date display to Italian format

### Phase 3: Currency Formatting ✅
- [x] Change currency symbol to € (Euro)
- [x] Update price formatting (e.g., "€10,50" instead of "$10.50")
- [x] All prices now use comma as decimal separator

### Phase 4: PWA Manifest ⏳
- [ ] Update app name in `manifest.json`
- [ ] Update app description
- [ ] Update short name

### Phase 5: Testing ⏳
- [ ] Test all pages in Italian
- [ ] Verify all labels are translated
- [ ] Check currency formatting
- [ ] Test error messages
- [ ] Verify date/time formatting

## Italian Translations Reference

### Common UI Text
- "Menu" → "Menu"
- "Cart" → "Carrello"
- "Order Status" → "Stato Ordine"
- "Add to Cart" → "Aggiungi al Carrello"
- "View Cart" → "Vedi Carrello"
- "Place Order" → "Invia Ordine"
- "Back to Menu" → "Torna al Menu"
- "Search" → "Cerca"
- "All" → "Tutti"
- "Quantity" → "Quantità"
- "Price" → "Prezzo"
- "Subtotal" → "Subtotale"
- "Tax" → "IVA"
- "Total" → "Totale"
- "Special Instructions" → "Istruzioni Speciali"
- "Empty" → "Vuoto"
- "Loading" → "Caricamento"
- "Online" → "Online"
- "Offline" → "Offline"

### Order Status
- "PENDING" → "In Attesa"
- "CONFIRMED" → "Confermato"
- "PREPARING" → "In Preparazione"
- "READY" → "Pronto"
- "DELIVERED" → "Consegnato"
- "CANCELLED" → "Annullato"
- "PAID" → "Pagato"

### Messages
- "Your cart is empty" → "Il tuo carrello è vuoto"
- "No orders yet" → "Nessun ordine ancora"
- "Order placed successfully!" → "Ordine inviato con successo!"
- "Failed to place order" → "Impossibile inviare l'ordine"
- "Network connection failed" → "Connessione di rete fallita"
- "You are offline" → "Sei offline"
- "Back online" → "Connesso di nuovo"

## Implementation Notes
- Use Italian locale for all formatters
- Keep code structure unchanged
- Update only user-facing text
- Maintain all existing functionality
