"use strict";

const npm = require('npm');

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

module.exports = class {

    constructor() { }

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

};
