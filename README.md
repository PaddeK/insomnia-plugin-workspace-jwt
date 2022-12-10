# Insomnia plugin for workspace wide JWT authentication
Simply define a request from within [Insomnia](https://insomnia.rest/) as authorization endpoint of the workspace and  
reference the token in the response via JSONPath or XPath.

# Pre-requisites
This plugin requires [Insomnia](https://insomnia.rest/).

# Installation
1. Start Insomnia,
2. Click "Preferences" and choose the "Plugins" tab,
3. Enter `insomnia-plugin-workspace-jwt` and click "Install Plugin"
4. Close the dialog.

# Usage
1. Select any Document or Collection
2. Click on the workspace drop down menu and select `Set Workspace JWT`  
3. You will be asked to select the authorization request
4. Define a JSONPath or XPath filter to reference the token in the response

or

1. Select any Document or Collection
2. Click on the request drop down menu and select `Use as Authorization request`
3. You will be asked to define a JSONPath or XPath filter to reference the token in the response

Note: 
Ensure that `No Authentication` is selected as the Auth type and no `Authorization` header is defined for any requests 
where you want this plugin to populate an `Authorization` header. 
Use environment variable `WORKSPACE-JWT-TOKEN-PREFIX` to set the token prefix. Default prefix is `Bearer`. 


# Cleanup saved data
1. Click on the workspace drop down menu and select `Clear Workspace JWT data`
2. Confirm deletion
