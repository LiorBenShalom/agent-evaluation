const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Function to create a values.yaml file if it doesn't exist
function createValuesFile(dirPath) {
    const valuesFilePath = path.join(dirPath, 'values.yaml');
    if (!fs.existsSync(valuesFilePath)) {
        fs.writeFileSync(valuesFilePath, '# Auto-generated values.yaml file\n');
        console.log(`Created file: ${valuesFilePath}`);
    } else {
        console.log(`File already exists, skipping: ${valuesFilePath}`);
    }
}

// Function to create the directory structure
function createStructure(basePath, envName, regions) {
    // Create the base deployment directory
    const deploymentPath = path.join(basePath, 'deployment');
    fs.mkdirSync(deploymentPath, { recursive: true });
    createValuesFile(deploymentPath);

    // Create the regions directory
    const regionsPath = path.join(deploymentPath, 'regions');
    fs.mkdirSync(regionsPath, { recursive: true });
    createValuesFile(regionsPath);

    regions.forEach(region => {
        // Create the region directory
        const regionPath = path.join(regionsPath, region);
        fs.mkdirSync(regionPath, { recursive: true });
        createValuesFile(regionPath);

        // Create the environment directory
        const envPath = path.join(regionPath, envName);
        fs.mkdirSync(envPath, { recursive: true });
        createValuesFile(envPath);

        // Create the EKS main blue and green node group directories
        const eksBluePath = path.join(envPath, `${envName}-eks-main-blue-ng`);
        const eksGreenPath = path.join(envPath, `${envName}-eks-main-green-ng`);

        fs.mkdirSync(eksBluePath, { recursive: true });
        createValuesFile(eksBluePath);

        fs.mkdirSync(eksGreenPath, { recursive: true });
        createValuesFile(eksGreenPath);
    });
}

// Set up command-line arguments
program
    .requiredOption('--env <env>', 'The environment name (e.g., nvq2)')
    .requiredOption('--regions <regions...>', 'List of regions (e.g., us-east-1)')
    .option('--base-path <basePath>', 'The base path where the deployment folder will be created. Defaults to the current working directory.', process.cwd());

program.parse(process.argv);


const options = program.opts();

// Run the script
createStructure(options.basePath, options.env, options.regions);