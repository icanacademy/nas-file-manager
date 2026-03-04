class WebDAVClient {
    constructor() {
        this.baseUrl = '';
        this.credentials = null;
        this.currentPath = '/';
    }

    setCredentials(url, username, password) {
        this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        this.credentials = btoa(`${username}:${password}`);
    }

    async request(method, path = '', body = null, headers = {}) {
        const url = `${this.baseUrl}${path}`;
        const requestHeaders = {
            'Authorization': `Basic ${this.credentials}`,
            'Content-Type': 'application/xml; charset=utf-8',
            ...headers
        };

        try {
            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body,
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            console.error('WebDAV request failed:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            await this.request('PROPFIND', '/', this.getPropfindBody(), {
                'Depth': '0'
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async listDirectory(path = '/') {
        const propfindBody = this.getPropfindBody();
        
        try {
            const response = await this.request('PROPFIND', path, propfindBody, {
                'Depth': '1'
            });

            const xmlText = await response.text();
            return this.parseDirectoryListing(xmlText, path);
        } catch (error) {
            console.error('Failed to list directory:', error);
            throw error;
        }
    }

    getPropfindBody() {
        return `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
    <D:allprop/>
</D:propfind>`;
    }

    parseDirectoryListing(xmlText, basePath) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const responses = xmlDoc.getElementsByTagNameNS('DAV:', 'response');
        
        const items = [];
        
        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            const href = response.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent;
            
            if (!href) continue;
            
            const decodedHref = decodeURIComponent(href);
            const relativePath = decodedHref.replace(this.baseUrl, '');
            
            if (relativePath === basePath) continue;
            
            const propstat = response.getElementsByTagNameNS('DAV:', 'propstat')[0];
            if (!propstat) continue;
            
            const prop = propstat.getElementsByTagNameNS('DAV:', 'prop')[0];
            if (!prop) continue;
            
            const isCollection = prop.getElementsByTagNameNS('DAV:', 'resourcetype')[0]
                ?.getElementsByTagNameNS('DAV:', 'collection').length > 0;
            
            const contentLength = prop.getElementsByTagNameNS('DAV:', 'getcontentlength')[0]?.textContent || '0';
            const lastModified = prop.getElementsByTagNameNS('DAV:', 'getlastmodified')[0]?.textContent;
            
            const pathParts = relativePath.split('/').filter(part => part);
            const name = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
            
            if (name) {
                items.push({
                    name,
                    path: relativePath,
                    isDirectory: isCollection,
                    size: isCollection ? 0 : parseInt(contentLength),
                    lastModified: lastModified ? new Date(lastModified) : new Date(),
                    href: decodedHref
                });
            }
        }
        
        return items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    async downloadFile(path) {
        try {
            const response = await this.request('GET', path);
            return await response.blob();
        } catch (error) {
            console.error('Failed to download file:', error);
            throw error;
        }
    }

    async uploadFile(path, file, onProgress) {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${this.credentials}`,
                    'Content-Type': file.type || 'application/octet-stream'
                },
                body: file
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            return true;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    async createDirectory(path) {
        try {
            await this.request('MKCOL', path);
            return true;
        } catch (error) {
            console.error('Failed to create directory:', error);
            throw error;
        }
    }

    async deleteItem(path) {
        try {
            await this.request('DELETE', path);
            return true;
        } catch (error) {
            console.error('Failed to delete item:', error);
            throw error;
        }
    }

    async moveItem(fromPath, toPath) {
        try {
            await this.request('MOVE', fromPath, null, {
                'Destination': `${this.baseUrl}${toPath}`
            });
            return true;
        } catch (error) {
            console.error('Failed to move item:', error);
            throw error;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileIcon(name, isDirectory) {
        if (isDirectory) return '📁';
        
        const ext = name.split('.').pop()?.toLowerCase();
        const iconMap = {
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️',
            'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'wmv': '🎬', 'flv': '🎬',
            'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵',
            'pdf': '📄', 'doc': '📄', 'docx': '📄', 'txt': '📄',
            'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦',
            'exe': '⚙️', 'msi': '⚙️', 'app': '⚙️'
        };
        
        return iconMap[ext] || '📄';
    }
}