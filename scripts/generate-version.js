const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
    // Get commit count
    const commitCount = execSync('git rev-list --count HEAD').toString().trim();

    // Read package.json
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = require(packageJsonPath);

    // Construct full version
    const version = `${packageJson.version}.${commitCount}`;

    // Create version.json content
    const versionData = {
        version: version,
        buildTime: new Date().toISOString()
    };

    // Write to version.json in root (or app/version.json if preferred, let's put in root for now and import in layout)
    // Actually, putting it in public or app might be better for import. 
    // Let's put it in the root for simplicity and import it like package.json
    const versionFilePath = path.join(__dirname, '../version.json');

    fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));

    console.log(`Generated version: ${version}`);

} catch (error) {
    console.error('Error generating version:', error.message);
    // Fallback? Ideally we don't break build, but version might be static.
    // If git fails (no git repo), we might just stick to package.json version
    try {
        const packageJsonPath = path.join(__dirname, '../package.json');
        const packageJson = require(packageJsonPath);
        const versionData = {
            version: packageJson.version,
            buildTime: new Date().toISOString(),
            error: "Git info unavailable"
        };
        const versionFilePath = path.join(__dirname, '../version.json');
        fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
        console.log(`Fallback version: ${packageJson.version}`);
    } catch (e) {
        console.error('Fatal version generation error');
    }
}
