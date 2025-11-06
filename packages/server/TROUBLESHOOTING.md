# WebSocket Connection Troubleshooting

## Error: "xhr poll error"

This error means the browser can't connect to the WebSocket server.

### Quick Fixes:

#### 1. Make Sure Server is Running

Check if you see this in the server terminal:
```
🔌 WebSocket server initialized
🚀 Server running on http://localhost:5000
```

If not, start the server:
```bash
cd packages/server
npm run dev
```

#### 2. Wait After Server Restart

If the server just restarted, wait 2-3 seconds before trying to connect.

#### 3. Check Server is Accessible

Open this URL in your browser:
```
http://localhost:5000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "services": {
    "database": "up",
    "websocket": "active"
  }
}
```

#### 4. Open HTML File Correctly

**IMPORTANT**: Open the HTML file directly in your browser, don't open it from VS Code or the file explorer in a way that uses `file://` protocol.

**Correct ways:**
- Double-click `test-websocket.html` to open in default browser
- Right-click → Open with → Chrome/Firefox/Edge
- Drag and drop into browser window

**Check the URL bar:**
- ✅ Good: `file:///F:/path/to/test-websocket.html`
- ❌ Bad: `vscode-webview://` or other protocols

#### 5. Try Different Browser

If using VS Code's built-in browser preview, try:
- Chrome
- Firefox  
- Edge

#### 6. Check Firewall

Make sure Windows Firewall isn't blocking port 5000:
```powershell
# Check if port 5000 is listening
netstat -ano | findstr :5000
```

You should see something like:
```
TCP    0.0.0.0:5000    0.0.0.0:0    LISTENING    12345
```

#### 7. Restart Server

Sometimes a clean restart helps:
```bash
# Stop the server (Ctrl+C)
# Then start again
npm run dev
```

---

## Alternative: Use Node.js Test Client

If the HTML client keeps having issues, use the Node.js client instead:

### Step 1: Get Token
```powershell
cd packages/server
.\test-websocket.ps1
```

### Step 2: Start Test Client
```bash
node test-websocket-client.js YOUR_TOKEN_HERE
```

### Step 3: Trigger Events
```bash
# In another terminal
node test-websocket-trigger.js YOUR_TOKEN_HERE
```

This bypasses browser issues entirely!

---

## Still Not Working?

### Check Server Logs

Look at the server terminal for errors. You should see:
```
🔌 WebSocket server initialized
```

If you see errors, they'll tell you what's wrong.

### Test with curl

```bash
curl http://localhost:5000/api/health
```

Should return JSON with `"status":"healthy"`

### Check Socket.io CDN

The HTML file loads Socket.io from CDN:
```html
<script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
```

Make sure you have internet connection for this to load.

### Browser Console

Open browser DevTools (F12) and check the Console tab for errors.

---

## Common Issues

### Issue: "CORS error"

**Solution**: Make sure you're using `http://localhost:5000` not `http://127.0.0.1:5000`

### Issue: "Token expired"

**Solution**: Get a new token (tokens expire after 24 hours):
```powershell
.\test-websocket.ps1
```

### Issue: Server keeps restarting

**Solution**: The `tsx watch` command restarts on file changes. This is normal. Just wait 2-3 seconds after restart before connecting.

### Issue: "Authentication required"

**Solution**: 
1. Make sure you pasted the full token
2. Token should start with `eyJ...`
3. Get a fresh token if it's old

---

## Success Checklist

- [ ] Server shows "🔌 WebSocket server initialized"
- [ ] `http://localhost:5000/api/health` returns healthy status
- [ ] HTML file opens in regular browser (not VS Code preview)
- [ ] Token is fresh (less than 24 hours old)
- [ ] Token is pasted correctly (starts with `eyJ`)
- [ ] Clicked "Connect" button
- [ ] Status shows green "Connected"

If all checked, it should work! 🎉

---

## Need Help?

If still having issues:

1. Check what the server terminal shows
2. Check browser console (F12) for errors
3. Try the Node.js test client instead
4. Make sure no other app is using port 5000
