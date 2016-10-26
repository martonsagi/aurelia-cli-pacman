/**
 * Mini cli helper for package management
 * - Installs/Uninstalls npm packages
 * - Configures bundle correctly
 *
 * It's pure ES6 to support Babel/Typescript projects as well
 *
 * Usage:
 * au pacman --install/i <package-name> [--bundle <custom-bundle-filename.js>] [--force]
 * au pacman --uninstall/u <package-name> [--bundle <custom-bundle-filename.js>]
 */

import * as fs from 'fs-extra';
import {CLIOptions} from 'aurelia-cli';
import {PacMan} from 'aurelia-cli-pacman';

/**
 * Reads aurelia.json
 *
 * Using this, because default import statement would
 * add a "default" member to the original object
 * causing problems at saving
 *
 * @return {Promise|Promise<any>}
 */
let getProject = () => {
    return new Promise((resolve, reject) => {
        let path = 'aurelia_project/aurelia.json';
        fs.readJson(path, (err, content) => {
            if (err) {
                reject(err);
            } else {
                resolve(content);
            }
        });
    });
};

/**
 * Execute
 */
export default () => {
    // package manager
    let pacMan = new PacMan(CLIOptions);

    // collect given parameters
    let cliParams = pacMan.getCliParams();

    if (!cliParams.action) {
        console.log(`Invalid or no action given. Please use one of these:\n`);
        for (let action of pacMan.allowedActions) {
            console.log(`  au pacman --${action.join('/')} <package name>`);
        }
        return;
    }

    let tasks = [getProject(), pacMan.getConfig(cliParams.pkg)];

    return Promise
        .all(tasks)
        .then(result => {
            //return pacMan[cliParams.action](cliParams.pkg)
            //    .then(ok => pacMan.configure(cliParams, ...result));
            return pacMan.configure(cliParams, ...result);
        })
        .catch(err => { throw new Error(err); });
};
