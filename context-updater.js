const fs = require('fs');
const path = require('path');

class ContextUpdater {
    constructor() {
        this.contextDir = path.join(__dirname, 'ai-context');
        this.ensureContextDir();
    }

    ensureContextDir() {
        if (!fs.existsSync(this.contextDir)) {
            fs.mkdirSync(this.contextDir, { recursive: true });
        }
    }

    // Scan HTML files for structure
    scanHtmlFiles() {
        const htmlDir = __dirname;
        const files = fs.readdirSync(htmlDir).filter(file => file.endsWith('.html'));
        
        const pages = [];
        
        files.forEach(file => {
            const content = fs.readFileSync(path.join(htmlDir, file), 'utf8');
            const pageName = file.replace('.html', '').replace('-', ' ');
            
            // Extract IDs and classes (simplified)
            const ids = [...content.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
            const classes = [...content.matchAll(/class="([^"]+)"/g)].map(m => m[1].split(' ')).flat();
            
            pages.push({
                file: file,
                name: pageName,
                url: `/${file}`,
                elementCount: ids.length + classes.length
            });
        });
        
        return pages;
    }

    // Update structure based on current files
    updateStructure() {
        const currentStructure = JSON.parse(
            fs.readFileSync(path.join(this.contextDir, 'structure.json'), 'utf8')
        );
        
        const htmlPages = this.scanHtmlFiles();
        
        // Update website map with actual pages
        currentStructure.websiteMap = currentStructure.websiteMap.map(page => {
            const matchingPage = htmlPages.find(p => p.name.toLowerCase().includes(page.page.toLowerCase()));
            if (matchingPage) {
                return { ...page, url: matchingPage.url };
            }
            return page;
        });
        
        // Add any missing pages
        htmlPages.forEach(htmlPage => {
            const exists = currentStructure.websiteMap.some(page => 
                page.page.toLowerCase().includes(htmlPage.name.toLowerCase())
            );
            
            if (!exists) {
                currentStructure.websiteMap.push({
                    page: htmlPage.name.charAt(0).toUpperCase() + htmlPage.name.slice(1),
                    url: htmlPage.url,
                    description: `Auto-detected page with ${htmlPage.elementCount} elements`,
                    elements: []
                });
            }
        });
        
        // Save updated structure
        fs.writeFileSync(
            path.join(this.contextDir, 'structure.json'),
            JSON.stringify(currentStructure, null, 2)
        );
        
        console.log(`Updated structure with ${htmlPages.length} HTML pages`);
    }

    // Generate documentation from JS files
    generateJsDocumentation() {
        const jsFiles = [
            'homepagejs.js',
            'ai-assistant.js',
            'ai-routes.js'
        ];
        
        let documentation = "# JavaScript Functions Documentation\n\n";
        
        jsFiles.forEach(file => {
            if (fs.existsSync(path.join(__dirname, file))) {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                
                // Extract function definitions (simplified)
                const functionRegex = /function\s+(\w+)\s*\([^)]*\)/g;
                const functions = [...content.matchAll(functionRegex)].map(m => m[1]);
                
                if (functions.length > 0) {
                    documentation += `## ${file}\n\n`;
                    documentation += `**Functions:**\n`;
                    functions.forEach(func => {
                        documentation += `- \`${func}()\`\n`;
                    });
                    documentation += '\n';
                }
            }
        });
        
        // Append to technical context
        const techContextPath = path.join(this.contextDir, 'technical-context.md');
        let techContext = fs.readFileSync(techContextPath, 'utf8');
        
        // Update or add JS documentation section
        if (techContext.includes('## JavaScript Functions')) {
            const lines = techContext.split('\n');
            const startIndex = lines.findIndex(line => line.includes('## JavaScript Functions'));
            const endIndex = lines.findIndex((line, index) => 
                index > startIndex && line.startsWith('## ') && !line.includes('JavaScript Functions')
            );
            
            if (endIndex > startIndex) {
                lines.splice(startIndex, endIndex - startIndex, ...documentation.split('\n'));
                techContext = lines.join('\n');
            }
        } else {
            techContext += '\n\n' + documentation;
        }
        
        fs.writeFileSync(techContextPath, techContext);
        console.log('Generated JavaScript documentation');
    }

    // Run all updates
    updateAll() {
        console.log('Updating AI context...');
        this.updateStructure();
        this.generateJsDocumentation();
        console.log('Context update complete!');
    }
}

// Run if called directly
if (require.main === module) {
    const updater = new ContextUpdater();
    updater.updateAll();
}

module.exports = ContextUpdater;