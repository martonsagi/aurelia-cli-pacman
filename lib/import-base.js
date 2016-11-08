"use strict";

const stepStates = require('./import-step-states'),
        execSync = require('child_process').execSync,
         rfc6902 = require('rfc6902'),
            path = require('path'),
              fs = require('fs-extra');

/**
 * Processes metadata located in <pkg-name@version?.json> metadata file
 *
 * Steps in execution order
 * 0. register
 *
 * 1. applyPatches
 * 2. registerDependencies
 * 3. registerBundles
 * 4. saveProject
 * 5. installTasks
 * 6. executeScripts
 */
module.exports = class {

    constructor() { }

    /**
     * Register this class with ImportEngine
     *
     * @param engine ImportEngine ImportEngine instance
     * @param options any given CLI arguments
     * @param projectInfo basic information about the project itself
     *
     */
    register(engine, options, projectInfo) {
        this.engine = engine;
        this.cliParams = options;
        this.projectInfo = projectInfo;
        this.ui = this.engine.cliBridge.ui;

        this.bundles = this.engine.projectConfig.build.bundles;
        if (this.bundles.length === 0) {
            throw new Error("aurelia.json: bundles section is missing.");
        }

        this.bundleName = this.cliParams.bundle || 'vendor-bundle.js';
        this.bundle = this.bundles.find(item => item.name === this.bundleName);
    }

    /**
     * Apply RFC6902 standard JSON patches against aurelia.json
     *
     * @return ImportStepState | void
     */
    applyPatches() {
        let project = this.engine.projectConfig,
            config = this.engine.definitionConfig;

        // patch aurelia.json settings with overrides
        if (this.cliParams.action === 'install') {
            if (config && config.patches && config.patches.length > 0) {

                let result = rfc6902.applyPatch(project, config.patches),
                    errors = result.filter(err => err !== null);

                if (errors.length > 0) {
                    let msg = errors.map(e => e.message).join(', ');
                    throw new Error(`An error occurred while applying custom settings.\nErrors: ${msg}`);
                }

                this.writeLine(`[INFO] Custom project settings have been applied to aurelia.json.`);
            }
        }
    }

    /**
     * Register dependencies within aurelia.json bundle section
     * @return ImportStepState | void
     */
    registerDependencies() {
        if (!this.bundle) {
            this.writeLine(`[INFO] Bundle '${this.bundleName}' could not be found. Looking for default bundles...`);

            // There are 2 sections by default, second is usually the vendor-bundle.js
            // Although, some developers prefer to merge everything into a single bundle
            let index = this.bundles.length > 1 ? 1 : 0;
            this.bundle = this.bundles[index];

            // this should not be reached ever, but never say never :)
            if (!bundle) {
                throw new Error('Default bundle could not be found either. Check aurelia.json configuration.');
            }

            this.bundleName = bundle.name;
        }

        if (!this.bundle.dependencies) {
            if (this.cliParams.action === 'uninstall') {
                this.writeLine(`[INFO] No dependencies found in ${this.bundleName}.`);
            }
            this.bundle.dependencies = [];
        }

        let config = this.engine.definitionConfig;
        if (config.dependencies && config.dependencies.length > 0) {
            this.writeLine(`[INFO] Bundle found: ${this.bundleName}. Configuring new dependencies in aurelia.json...`);
            for (let dep of config.dependencies) {
                let name = dep.name || dep,
                    check = this.bundle.dependencies.find(item => (item.name || item) === name);

                if (!check) {
                    if (this.cliParams.action === 'install') {
                        this.bundle.dependencies.push(dep);
                        this.writeLine(`[NEW] '${name}' has been configured.`);
                    }
                } else {
                    let i = this.bundle.dependencies.indexOf(check);

                    if (this.cliParams.action === 'install') {
                        if (this.cliParams.force) {
                            this.bundle.dependencies[i] = dep;
                            this.writeLine(`[MOD] '${name}' has been modified.`);
                        } else {
                            this.writeLine(`[SKIP] '${name}' has already been configured.`);
                        }
                    } else {
                        this.bundle.dependencies.splice(i, 1);
                        this.writeLine(`[DEL] '${name}' has been removed.`);
                    }
                }
            }
            this.writeLine(`[OK] ${this.bundleName} has been configured.\n`);
        }

    }

    /**
     * Register new bundle configuration(s) in aurelia.json
     * @return ImportStepState | void
     */
    registerBundles() {
        let config = this.engine.definitionConfig;
        if (config.bundles && config.bundles.length > 0) {
            this.writeLine(`[INFO] Additional bundles found. Configuring new bundles in aurelia.json...`);
            for (let newBundle of config.bundles) {
                let checkBundle = this.bundles.find(b => b.name === newBundle.name);
                if (!checkBundle) {
                    if (this.cliParams.action === 'install') {
                        this.bundles.push(newBundle);
                        this.writeLine(`[NEW] Bundle '${newBundle.name}' has been added.`);
                    }
                } else {
                    let i = this.bundles.indexOf(checkBundle);

                    if (this.cliParams.action === 'install') {
                        if (this.cliParams.force) {
                            this.bundles[i] = newBundle;
                            this.writeLine(`[MOD] Bundle '${newBundle.name}' has been modified.`);
                        } else {
                            this.writeLine(`[SKIP] Bundle '${newBundle.name}' has already been configured, no action taken. Use --force/f switch to override entire bundles.`);
                        }
                    } else {
                        this.bundles.splice(i, 1);
                        this.writeLine(`[DEL] Bundle '${newBundle.name}' has been removed.`);
                    }
                }
            }
        }

    }

    /**
     * Install custom aurelia-cli tasks to aurelia_project/tasks folder
     *
     * Capable of installing tasks provided by the npm package
     * currently being configured (e.g. ./node_modules/plugin/..)
     *
     * @return ImportStepState | void
     */
    installTasks() {
        let tasks = this.engine.definitionConfig.tasks ||[];
        if (tasks.length > 0) {
            this.writeLine(`[INFO] ${tasks.length} custom task(s) found. Copying to aurelia_project/tasks folder...`);
        }

        let projectFolder = 'aurelia_project/',
            project = this.engine.projectConfig,
            destFolder = `${projectFolder}tasks/`;

        for (let taskName of tasks) {
            // determinate transpiler to set correct file extension
            let filename = taskName + project.transpiler.fileExtension,
                destFile = destFolder + filename,
                source = null;

            // If file is missing, aborting importation process by throwing an Error
            try {
                // by default, search in installed package directory
                let pkgName = this.cliParams.pkg;
                pkgName = pkgName.indexOf('@') !== -1 ? pkgName.split('@')[0] : pkgName;
                source = path.resolve(__dirname, `../../${pkgName}/install/${taskName}`);
                fs.copySync(`${source}.js`, destFile);
            } catch (e) {
                try {
                    // fallback to 'tasks' folder in aurelia-cli-pacman
                    source = path.resolve(__dirname, `../tasks/${taskName}`);
                    fs.copySync(`${source}.js`, destFile);
                } catch (ex) {
                    throw new Error(`CLI Task '${taskName}' was not found: ${source}. Process aborted...`);
                }
            }

            // task metadata is optional
            try {
                let fileInfo = fs.statSync(`${source}.json`);
                if (fileInfo.isFile()) {
                    fs.copySync(`${source}.json`, `${dest + taskName}.json`);
                }
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    this.writeLine(`[ERR] ${source}.json: `, err);
                }
            }

            this.writeLine(`[INFO] Custom task: ${taskName} has been installed.`);
        }

        this.writeLine(`[OK] Custom tasks have been installed successfully.\n`);
    }

    /**
     * Execute custom defined scripts
     * E.g. execute previously installed tasks (au <task>
     *      execute any other node script
     *
     * @return ImportStepState | void
     */
    executeScripts() {
        let config = this.engine.definitionConfig;

        try {
            let checkScripts = config.scripts ? config.scripts[this.cliParams.action] || null : null;

            if (checkScripts && checkScripts.length > 0) {
                this.writeLine(`[INFO] Additional scripts found. Executing...`);
                for (let script of checkScripts) {
                    this.writeLine(`[EXE] Executing: ${script}`);
                    execSync(script);
                }
            }
            this.writeLine(`[OK] Additional scripts finished successfully.`);
            this.writeLine(`\n[OK] ${this.cliParams.pkg} has been configured successfully.`);
        } catch (e) {
            this.writeLine(`[ERR] An error occurred during script execution.`, e.message);
        }
    }

    /**
     * Backup original file, save changes to aurelia.json
     *
     * @return ImportStepState | void
     */
    saveProject() {
        let aureliaProjectFile = 'aurelia_project/aurelia.json',
            aureliaProjectFileBackup = `${aureliaProjectFile}.${Date.now()}.bak`;

        this.writeLine('[INFO] Saving changes to aurelia.json file...');
        fs.copySync(aureliaProjectFile, aureliaProjectFileBackup);

        this.writeLine(`[INFO] Backup of aurelia.json has been created: ${aureliaProjectFileBackup}`);

        fs.writeJsonSync(aureliaProjectFile, this.engine.projectConfig);
        this.writeLine(`[OK] ${aureliaProjectFile} has been updated.\n`);
    }

    /**
     * Output messages controlled by --quiet option
     *
     * @param msg string message
     * @param err any additional data
     * @void
     */
    writeLine(msg, err) {
        if (this.cliParams.quiet !== true) {
            console.log(msg, err || '');
        }
    }
};
