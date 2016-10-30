"use strict";

const fs = require('fs-extra');
const path = require('path');

module.exports = class {

    constructor(CLIOptions) {
        this.registryPath = '../registry/';
        this.CLIOptions = CLIOptions;
        this.allowedActions = [['install', 'i'], ['uninstall', 'u']];
        this.result = null;
    }

    execute() {
        let cliParams = this.getCliParams();
        return Promise.all([this.getProject(), this.getConfig(cliParams.pkg)])
            .then(result => {
                this.result = { project: result[0], config: result[1], options: cliParams};
                return this.result;
            });
    }

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
        options.quiet = this.CLIOptions.hasFlag('quiet', 'q');

        return options;
    };

    /**
     * Reads aurelia.json
     *
     * @return {Promise|Promise<any>}
     */
    getProject() {
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
     * Search for pre-defined dependencies in local 'registry' folder
     *
     * @param pkgName string package name
     * @return {Promise}
     */
    getConfig(pkgName) {
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
                            t.getConfig(realPkgName)
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
     * Package might have a @version tag in its name
     *
     * @param pkgName string package name
     * @return {*}
     */
    getRealPkgName(pkgName) {
        return pkgName.indexOf('@') !== -1 ? pkgName.split('@')[0] : pkgName;
    }

};
