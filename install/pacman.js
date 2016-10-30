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
import {ImportEngine, ImportBase, Analyzer, NpmProvider} from 'aurelia-cli-pacman';

/**
 * Execute
 */
export default () => {

    let analyzer = new Analyzer(CLIOptions);
    analyzer
        // analyze contextual information (CLI parameters, given package)
        .execute()

        // manage package using NPM (OPTIONAL, commented out by default)
        /*.then(result => {
            let npmProvider = new NpmProvider();
            return npmProvider[result.options.action](result.options.pkg);
        })*/

        // configure aurelia.json, install custom tasks, run additional scripts
        .then(() => {
            let engine = new ImportEngine(
                analyzer.result.project,
                analyzer.result.config,
                [new ImportBase()]
            );

            return engine.execute(analyzer.result.options);
        })
        .catch(e => console.log(e));

};
