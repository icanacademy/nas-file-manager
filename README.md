# NAS File Manager

A web-based file manager for ipTIME NAS systems that provides an alternative interface to access your NAS files through WebDAV.

## Features

- 🔐 Secure authentication with your NAS credentials
- 📁 Browse files and folders with an intuitive interface
- ⬆️ Upload multiple files simultaneously
- ⬇️ Download files directly to your device
- 📝 Create, rename, and delete files/folders
- 📱 Responsive design for mobile and desktop
- 🌐 Access from anywhere (when published)

## Quick Start

1. **Local Development:**
   ```bash
   cd nas-file-manager
   npm run dev
   ```
   Then open http://localhost:3000

2. **Production:**
   ```bash
   npm start
   ```
   Then open http://localhost:8080

## Configuration

The app comes pre-configured for your NAS:
- **WebDAV URL:** `http://edudrive.ipdisk.co.kr/dav`
- **Network:** 192.168.68.142 (local access)
- **DDNS:** edudrive.ipdisk.co.kr (external access)

## Usage

1. **Connect:** Enter your NAS username and password
2. **Browse:** Navigate through folders by double-clicking
3. **Upload:** Click the upload button to add files
4. **Download:** Click the download icon next to any file
5. **Manage:** Use the action buttons to rename or delete items

## Deployment

To make this app available to users outside your network:

1. **Deploy to a web server** (GitHub Pages, Netlify, Vercel, etc.)
2. **Configure CORS** on your NAS if needed
3. **Use HTTPS** for secure access to your NAS
4. **Consider authentication** for additional security

## Browser Compatibility

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Mobile browsers with CORS support

## Security Notes

- Always use HTTPS in production
- Credentials are only sent to your NAS server
- No data is stored on external servers
- Enable NAS access logging for monitoring

## Technical Details

- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Protocol:** WebDAV over HTTP/HTTPS
- **Authentication:** HTTP Basic Auth
- **File Operations:** Full CRUD support
- **CORS:** Required for browser access

## Troubleshooting

- **Connection Issues:** Check NAS network settings and WebDAV service
- **Upload Failures:** Verify NAS disk space and permissions
- **CORS Errors:** Enable CORS on your NAS or use a proxy
- **Mobile Issues:** Ensure WebDAV service is accessible externally