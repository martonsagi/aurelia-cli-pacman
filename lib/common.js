/**
 * Mini cli extension for package management
 * - Installs/Uninstalls npm packages
 * - Configures bundle correctly
 *
 * It's referenced in 'pacman' custom aurelia-cli task
 */

"use strict";

const fs = require('fs-extra'),
    path = require('path'),
    npm = require('npm'),
    rfc6902 = require('rfc6902');

/**
 * NPM api helper
 *
 * @param action string
 * @param pkgName string
 * @return {Promise}
 */
let NPMLoader = function (action, pkgName) {
    return new Promise(function (resolve, reject) {
        npm.load({
            loaded: false
        }, function (err) {
            if (err) {
                reject(err);
            } else {
                npm.config.set('save', true);
                npm.commands[action]([pkgName], function (err, data) {
                    // log the error or data
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`[NPM] '${pkgName}' has been ${action}ed.`);
                        resolve(true);
                    }
                });
                npm.on("log", function (message) {
                    // log the progress of the installation
                    console.log(message);
                });
            }
        });
    });
};

/**
 * Package manager class
 *
 * Adds/removes npm packages
 * Configures bundle section of aurelia.json
 */
exports.PacMan = class {

    /**
     * Constructor
     * @param CLIOptions
     */
    constructor(CLIOptions) {
        this.CLIOptions = CLIOptions;
        this.registryPath = '../registry/';
        this.allowedActions = [['install', 'i'], ['uninstall', 'u']];
    }

    /**
     * Install npm package
     *
     * @param pkgName string package name
     * @return {Promise}
     */
    install(pkgName) {
        return NPMLoader('install', pkgName);
    }

    /**
     * Uninstall npm package
     *
     * @param pkgName string package name
     * @return {Promise}
     */
    uninstall(pkgName) {
        return NPMLoader('uninstall', pkgName);
    }

    /**
     * Configure package dependencies
     * Edit aurelia.json to add/remove pre-configured dependencies for specified package
     *
     * @void
     */
    configure(cliParams, project, deps) {
        if (!deps) {
            return;
        }

        // patch aurelia.json settings with overrides
        if (deps && deps.patches && deps.patches.length > 0) {
            let result = rfc6902.applyPatch(project, deps.patches),
                errors = result.filter(err => err !== null);

            if (errors.length > 0) {
                console.log(`[ERR] An error occurred while applying custom settings. Exiting...\n`, errors);
                return;
            }

            console.log(`[INFO] Custom project settings has been applied to aurelia.json.`);
        }

        if (deps.dependencies && deps.dependencies.length === 0) {
            console.log(`[INFO] There are no dependencies to configure for ${cliParams.pkg} in aurelia.json. Exiting...`);
            return;
        }

        let bundle = null,
            bundles = project.build.bundles;

        if (bundles.length === 0) {
            throw new Error("aurelia.json: bundles section is missing.");
        }

        let bundleName = cliParams.bundle || 'vendor-bundle.js';

        bundle = bundles.find(item => item.name === bundleName);

        if (!bundle) {
            console.log(`[INFO] Bundle '${bundleName}' could not be found. Looking for default bundles...`);

            // There are 2 sections by default, second is usually the vendor-bundle.js
            // Although, some developers prefer to merge everything into a single bundle
            let index = bundles.length > 1 ? 1 : 0;
            bundle = bundles[index];

            // this should not be reached ever, but never say never :)
            if (!bundle) {
                throw new Error('Default bundle could not be found either. Check aurelia.json configuration.');
            }

            bundleName = bundle.name;
        }

        if (!bundle.dependencies) {
            if (cliParams.action === 'uninstall') {
                console.log(`[INFO] No dependencies found in ${bundleName}. Exiting...`);
                return;
            }
            bundle.dependencies = [];
        }

        console.log(`[INFO] Bundle found: ${bundleName}. Configuring new dependencies in aurelia.json...`);
        for (let dep of deps.dependencies) {
            let name = dep.name || dep,
                check = bundle.dependencies.find(item => (item.name || item) === name);

            if (!check) {
                if (cliParams.action === 'install') {
                    console.log(`[NEW] '${name}' has been configured.`);
                    bundle.dependencies.push(dep);
                }
            } else {
                let i = bundle.dependencies.indexOf(check);

                if (cliParams.action === 'install') {
                    if (cliParams.force) {
                        bundle.dependencies[i] = dep;
                        console.log(`[MOD] '${name}' has been modified.`);
                    } else {
                        console.log(`[SKIP] '${name}' has already been configured.`);
                    }
                } else {
                    bundle.dependencies.splice(i, 1);
                    console.log(`[DEL] '${name}' has been removed.`);
                }
            }
        }

        console.log('[INFO] Saving changes to aurelia.json file...');
        let aureliaProjectFile = 'aurelia_project/aurelia.json',
            aureliaProjectFileBackup = `${aureliaProjectFile}.${Date.now()}.bak`;

        fs.copy(aureliaProjectFile, aureliaProjectFileBackup, function (err) {
            if (err) {
                console.log('[ERROR] An error occurred while duplicating aurelia.json.', err);
            } else {
                console.log(`[INFO] Backup of aurelia.json has been created: ${aureliaProjectFileBackup}`);
                fs.writeJson(aureliaProjectFile, project, (err) => {
                    if (err) {
                        console.log('[ERROR] An error occurred while updating aurelia.json.', err);
                    } else {
                        console.log(`[OK] ${aureliaProjectFile} has been updated.`);
                        console.log(`\n\n[OK] ${cliParams.pkg} has been configured successfully.`);
                    }
                });
            }
        });
    };

    /**
     * Simple wrapper for built-in CLIOptions
     *
     * @param name
     * @param shortcut
     * @returns {any|null}
     */
    getCliParam(name, shortcut) {
        if (this.CLIOptions.hasFlag(name, shortcut)) {
            return this.CLIOptions.getFlagValue(name, shortcut) || null;
        }
    };

    /**
     * Collect given CLI parameters
     *
     * @return {any}
     */
    getCliParams() {
        let options = {},
            actionParam = this.getAction();

        options.action = actionParam[0];
        options.pkg = actionParam[1] || null;
        options.bundle = this.getCliParam('bundle', 'b');
        options.force = this.CLIOptions.hasFlag('force', 'f');

        return options;
    };

    /**
     * Determinate action to execute (install/uninstall)
     *
     * @return Array<string>
     */
    getAction() {
        for (let action of this.allowedActions) {
            if (this.CLIOptions.hasFlag(action[0], action[1])) {
                return [action[0], this.getCliParam(action[0], action[1])];
            }
        }

        return [null, null];
    };

    /**
     * Search for pre-defined dependencies in local 'registry' folder
     *
     * @param pkgName string package name
     * @return {Promise}
     */
    getDependencies(pkgName) {
        let t = this;

        return new Promise(function (resolve, reject) {
            t.exists(pkgName)
                .then(function (exists) {
                    if (exists === true) {
                        fs.readJson(t.getFilename(pkgName), function (err, data) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(data);
                            }
                        });
                    } else {
                        // when package name contains @version and it has no version-specific metadata,
                        // we check again with basename (pkg@0.1 => pkg)
                        let realPkgName = t.getRealPkgName(pkgName);
                        if (realPkgName !== pkgName) {
                            t.getDependencies(realPkgName)
                                .then(data => resolve(data));
                        } else {
                            resolve(null);
                        }
                    }
                })
                .catch(function (e) {
                    reject(e);
                });
        });
    }

    /**
     * Determinate filepath of pre-defined json settings file.
     *
     * @param pkgName
     * @return {Promise.<*>|*}
     */
    getFilename(pkgName) {
        return path.resolve(__dirname, `${this.registryPath + pkgName}.json`);
    }

    /**
     * Check whether a pre-defined configuration exists
     *
     * @param pkgName string package name
     * @return {Promise}
     */
    exists(pkgName) {
        let t = this;

        return new Promise(function (resolve, reject) {
            fs.exists(t.getFilename(pkgName), function (exists) {
                resolve(exists);
            });
        });
    }

    /**
     * Package might has a @version tag in its name
     *
     * @param pkgName string package name
     * @return {*}
     */
    getRealPkgName(pkgName) {
        return pkgName.indexOf('@') !== -1 ? pkgName.split('@')[0] : pkgName;
    }

    /**
     * Remove previously backed up 'aurelia.json.<timestamp>.bak' files
     * @todo
     */
    cleanup() {
        throw new Error('Not implemented yet.');
    }
};
