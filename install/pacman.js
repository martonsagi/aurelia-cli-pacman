/**
 * Mini cli helper for package management
 * - Can installs/uninstall npm packages
 * - Configures bundle correctly
 *
 * It's pure ES6 to support Babel/Typescript projects as well
 *
 * Usage:
 * au pacman --install/i <package-name> [--bundle <custom-bundle-filename.js>] [--force] [--quiet]
 * au pacman --uninstall/u <package-name> [--bundle <custom-bundle-filename.js>] [--quiet]
 */

import {CLIOptions} from 'aurelia-cli';
import {ImportEngine, ImportBase, Analyzer, NpmProvider} from 'aurelia-cli-pacman';

/**
 * Execute
 */
export default () => {

    let analyzer = new Analyzer(CLIOptions);

    // remove /**/ to manage packages with NPM (OPTIONAL, commented out by default)
    /*
    let cliParams = analyzer.getCliParams();
    let npmProvider = new NpmProvider();
    npmProvider[cliParams.action](cliParams.pkg)
        .then(() => analyzer.execute())
    */

    // remove /**/ to go on without package management (default)
    ///*
    analyzer
        // analyze contextual information (CLI parameters, given package)
        .execute()
    //*/
        // configure aurelia.json, install custom tasks, run additional scripts
        .then(() => {
            let engine = new ImportEngine(
                analyzer.result.project,
                analyzer.result.config,
                [new ImportBase(), analyzer.result.importer]
            );

            return engine.execute(analyzer.result.options);
        })
        .catch(e => console.log(e));

};
