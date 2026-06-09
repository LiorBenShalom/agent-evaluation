# Kaltura Microservices Template

![Node](https://img.shields.io/badge/Node-22-brightgreen?)
![MongoDB](https://img.shields.io/badge/MongoDB-5.0-green?logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)


## Getting Started

### Creating a New Project

1. Create a new repository in GitHub
2. Click the dropdown menu under the `Repository template`
3. Select `kaltura/ovp-ms-template`

### Running the Application Locally
#### Prerequisites
* Node.js (v22 or higher)
* npm
* MongoDB (v5.0)
    
    If you don't have MongoDB installed locally, you can run it using Docker with the following command:
    ```bash
    docker run -d -p 27017:27017 --name ms-template-mongo mongo:5.0
    ```
* Env vars:

    | Variable | Description |
    |---|---|
    | `KALT_REGISTRY_TOKEN` | For installing JFrog packages |
    | `GIT_TOKEN` | For installing Kaltura GitHub packages |
    | `INTER_SERVICE_CALL_SECRET` | Inter-service communication secret |
    | `SERVICE_PARTNER_ID` | Service partner ID |
    | `SERVICE_PARTNER_SECRET` | Service partner secret |



#### Install the dependencies:
```bash
npm install
```

#### To run the application:
```bash
npm run start[:dev] template
```
Thats it! You can access Swagger at http://localhost:3000/api


### Creating repository secrets

1. Go to the repository settings
2. Click on `Secrets and variables`
3. Click on `Actions`
4. New repository secret
5. Add the following secrets:
    - `DOWNLOAD_PACKAGES_PAT` -> This is the NPM token used to download the dependencies (reach DevOps).
    - `RUNNER_TOKEN` -> This is the GitHub token used to run git based actions (reach DevOps)


### Initializing the Project

1. Set a `GIT_TOKEN` environment variable in the terminal

    This is needed for being able to install private Kaltura GitHub packages.
    Create your private PAT with read package permissions (Make sure to configure the PAT SSO against Kaltura)
    See [GitHub PAT Instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#about-personal-access-tokens)
    ```bash
    export GIT_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxx
    ```
1. Install dependencies:
    ```bash
    npm install
    ```
    _The GitHub token is needed for every install_
1. If you plan to connect your local MS app Kaltura BE on NVQ2 environment then connect to Kaltura VPN so that you can gain access to Kaltura BE.
 (If you connect to Local BE or OnPrem then this step is not required since the security measures do not apply).
1. Run the application:
    ```bash
    npm start <app-name> // Default app-name is 'template'
    ```

### Repository tools
The `repo-tools` is the place to put any custom scripts that can help you manage the repository effectively.
For now you can find the `create-deployment-structure.js` script that can help you create the helm deployment structure based on the environment and the region and make it easier to deploy your app to new region.
#### How to use the `create-deployment-structure.js` script:
The script is part of the `package.json` file and you can run it with the following command:
```bash
npm run helm-env -- --env <ENV> --regions <REGION>
```
e.g:
```bash
npm run helm-env -- --env frp2 --regions eu-central-1
```
This will create the directory structure for the `frp2` environment in the `eu-central-1` region.

You are more than welcome to add any other scripts that can help you manage the repository effectively.
