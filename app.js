class NASFileManager {
    constructor() {
        this.webdav = new WebDAVClient();
        this.currentPath = '/';
        this.isConnected = false;
        this.initializeElements();
        this.bindEvents();
        this.autoConnect();
    }

    initializeElements() {
        this.fileManager = document.getElementById('fileManager');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.fileList = document.getElementById('fileList');
        this.breadcrumb = document.getElementById('breadcrumb');
        this.uploadModal = document.getElementById('uploadModal');
        this.fileInput = document.getElementById('fileInput');
        this.uploadProgress = document.getElementById('uploadProgress');
    }

    bindEvents() {
        document.getElementById('reconnectBtn').addEventListener('click', () => this.autoConnect());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshCurrentDirectory());
        document.getElementById('uploadBtn').addEventListener('click', () => this.showUploadModal());
        document.getElementById('newFolderBtn').addEventListener('click', () => this.createNewFolder());
        
        document.getElementById('uploadConfirm').addEventListener('click', () => this.handleUpload());
        document.getElementById('uploadCancel').addEventListener('click', () => this.hideUploadModal());
        
        this.uploadModal.addEventListener('click', (e) => {
            if (e.target === this.uploadModal) this.hideUploadModal();
        });
    }

    async autoConnect() {
        try {
            this.showLoading('Connecting to NAS...');
            this.connectionStatus.textContent = 'Connecting...';
            
            // Try public access first (no authentication)
            const publicUrl = 'http://edudrive.ipdisk.co.kr/list';
            
            // Try WebDAV with anonymous access
            this.webdav.setCredentials('http://edudrive.ipdisk.co.kr/dav', '', '');
            
            const connected = await this.webdav.testConnection();
            
            if (connected) {
                this.isConnected = true;
                this.connectionStatus.textContent = 'Connected (Public Access)';
                this.connectionStatus.classList.add('connected');
                await this.loadDirectory('/');
            } else {
                // Try the list interface instead
                await this.loadPublicDirectory();
            }
        } catch (error) {
            this.showError('Connection failed. Trying alternative access method...');
            await this.loadPublicDirectory();
        }
    }

    async loadPublicDirectory() {
        try {
            // Use the public list interface
            const response = await fetch('http://edudrive.ipdisk.co.kr/list', {
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                this.isConnected = true;
                this.connectionStatus.textContent = 'Connected (Public List)';
                this.connectionStatus.classList.add('connected');
                
                const html = await response.text();
                this.parsePublicListing(html);
            } else {
                throw new Error('Public access not available');
            }
        } catch (error) {
            this.showError('Unable to connect to NAS. Please check if public access is enabled.');
            this.connectionStatus.textContent = 'Connection Failed';
        }
    }

    parsePublicListing(html) {
        // Simple HTML parser for directory listing
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Look for common directory listing patterns
        const links = doc.querySelectorAll('a[href]');
        const items = [];
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim();
            
            if (href && text && !href.startsWith('http') && href !== '../') {
                const isDirectory = href.endsWith('/');
                items.push({
                    name: text,
                    path: href,
                    isDirectory,
                    size: 0,
                    lastModified: new Date(),
                    href: href
                });
            }
        });
        
        this.renderFileList(items);
        this.updateBreadcrumb('/');
    }

    disconnect() {
        this.isConnected = false;
        this.connectionStatus.textContent = 'Disconnected';
        this.connectionStatus.classList.remove('connected');
        this.currentPath = '/';
    }

    async loadDirectory(path) {
        try {
            this.showLoading('Loading directory...');
            this.currentPath = path;
            
            const items = await this.webdav.listDirectory(path);
            this.renderFileList(items);
            this.updateBreadcrumb(path);
        } catch (error) {
            this.showError('Failed to load directory: ' + error.message);
        }
    }

    renderFileList(items) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        if (this.currentPath !== '/') {
            const parentItem = this.createFileItem({
                name: '..',
                path: this.getParentPath(this.currentPath),
                isDirectory: true,
                size: 0,
                lastModified: new Date()
            });
            fileList.appendChild(parentItem);
        }
        
        items.forEach(item => {
            const fileItem = this.createFileItem(item);
            fileList.appendChild(fileItem);
        });
    }

    createFileItem(item) {
        const div = document.createElement('div');
        div.className = `file-item ${item.isDirectory ? 'folder' : ''}`;
        
        const icon = this.webdav.getFileIcon(item.name, item.isDirectory);
        const size = item.isDirectory ? '-' : this.webdav.formatFileSize(item.size);
        const modified = item.lastModified.toLocaleDateString();
        
        div.innerHTML = `
            <div class="file-name">
                <span class="file-icon">${icon}</span>
                <span>${item.name}</span>
            </div>
            <div class="file-size">${size}</div>
            <div class="file-modified">${modified}</div>
            <div class="file-actions">
                ${!item.isDirectory ? `<button onclick="app.downloadFile('${item.path}', '${item.name}')">⬇️</button>` : ''}
                <button onclick="app.renameItem('${item.path}', '${item.name}')">✏️</button>
                <button onclick="app.deleteItem('${item.path}', '${item.name}')">🗑️</button>
            </div>
        `;
        
        if (item.isDirectory) {
            div.addEventListener('dblclick', () => {
                this.loadDirectory(item.path);
            });
        }
        
        return div;
    }

    updateBreadcrumb(path) {
        const parts = path.split('/').filter(part => part);
        let breadcrumbHtml = '<a href="#" onclick="app.loadDirectory(\'/\')">Home</a>';
        
        let currentPath = '';
        parts.forEach(part => {
            currentPath += '/' + part;
            breadcrumbHtml += ` / <a href="#" onclick="app.loadDirectory('${currentPath}')">${part}</a>`;
        });
        
        this.breadcrumb.innerHTML = breadcrumbHtml;
    }

    getParentPath(path) {
        const parts = path.split('/').filter(part => part);
        parts.pop();
        return parts.length === 0 ? '/' : '/' + parts.join('/');
    }

    async refreshCurrentDirectory() {
        await this.loadDirectory(this.currentPath);
    }

    showUploadModal() {
        this.uploadModal.style.display = 'flex';
    }

    hideUploadModal() {
        this.uploadModal.style.display = 'none';
        this.fileInput.value = '';
        this.uploadProgress.innerHTML = '';
    }

    async handleUpload() {
        const files = this.fileInput.files;
        if (files.length === 0) return;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const filePath = this.currentPath + (this.currentPath.endsWith('/') ? '' : '/') + file.name;
                
                this.updateUploadProgress(`Uploading ${file.name}...`, (i / files.length) * 100);
                
                await this.webdav.uploadFile(filePath, file);
            }
            
            this.updateUploadProgress('Upload complete!', 100);
            setTimeout(() => {
                this.hideUploadModal();
                this.refreshCurrentDirectory();
            }, 1000);
            
        } catch (error) {
            this.showError('Upload failed: ' + error.message);
        }
    }

    updateUploadProgress(message, percent) {
        this.uploadProgress.innerHTML = `
            <div>${message}</div>
            <div class="upload-progress">
                <div class="progress-bar" style="width: ${percent}%"></div>
            </div>
        `;
    }

    async downloadFile(path, filename) {
        try {
            this.showLoading('Downloading file...');
            
            // Try direct download from public URL first
            const downloadUrl = `http://edudrive.ipdisk.co.kr${path}`;
            
            const response = await fetch(downloadUrl);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.hideLoading();
            } else {
                // Fallback to WebDAV if available
                const blob = await this.webdav.downloadFile(path);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.hideLoading();
            }
        } catch (error) {
            // Last resort: try direct link
            window.open(`http://edudrive.ipdisk.co.kr${path}`, '_blank');
            this.hideLoading();
        }
    }

    async createNewFolder() {
        const name = prompt('Enter folder name:');
        if (!name) return;
        
        try {
            const folderPath = this.currentPath + (this.currentPath.endsWith('/') ? '' : '/') + name;
            await this.webdav.createDirectory(folderPath);
            await this.refreshCurrentDirectory();
        } catch (error) {
            this.showError('Failed to create folder: ' + error.message);
        }
    }

    async deleteItem(path, name) {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
        
        try {
            await this.webdav.deleteItem(path);
            await this.refreshCurrentDirectory();
        } catch (error) {
            this.showError('Failed to delete item: ' + error.message);
        }
    }

    async renameItem(path, oldName) {
        const newName = prompt('Enter new name:', oldName);
        if (!newName || newName === oldName) return;
        
        try {
            const parentPath = this.getParentPath(path);
            const newPath = parentPath + (parentPath.endsWith('/') ? '' : '/') + newName;
            await this.webdav.moveItem(path, newPath);
            await this.refreshCurrentDirectory();
        } catch (error) {
            this.showError('Failed to rename item: ' + error.message);
        }
    }

    showLoading(message) {
        this.fileList.innerHTML = `<div class="loading">${message}</div>`;
    }

    hideLoading() {
        // Loading will be hidden when content is rendered
    }

    showError(message) {
        this.fileList.innerHTML = `<div class="loading" style="color: #e74c3c;">❌ ${message}</div>`;
        console.error(message);
    }
}

// Initialize the app
const app = new NASFileManager();