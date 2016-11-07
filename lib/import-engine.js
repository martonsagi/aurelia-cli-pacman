"use strict";

const stepStates = require('./import-step-states'),
       CliBridge = require('./cli-bridge'),
         Promise = require('bluebird'),
            path = require('path');

/**
 * Import Processing Engine
 *
 * Holds no specific logic but uses Custom Importer implementations
 * to preform operations related to package importation
 *
 * @abstract
 */
module.exports = class {

    /**
     * Constructor
     *
     * @param projectConfig Project settings (e.g. aurelia.json)
     * @param definitionConfig Import Definition metadata
     * @param customImporters Array<any> Custom Importation logic to be executed
     */
    constructor(projectConfig, definitionConfig, customImporters) {
        if (!projectConfig) {
            throw new Error(`Project configuration isn't given or empty.`);
        }

        // basic information
        this.projectConfig = projectConfig;
        this.definitionConfig = definitionConfig;
        this.cliBridge = new CliBridge();

        // default steps
        this.availableSteps = ['applyPatches', 'registerDependencies', 'registerBundles', 'saveProject', 'installTasks', 'executeScripts'];

        // custom rules or import logic
        this.customImporters = customImporters || [];
        if (this.customImporters.length > 0) {
            this.customImporters = this.customImporters.filter(elem => elem !== null);
        }
    }

    /**
     * Override predefined steps and step order
     *
     * @param override Array<string> array containing overridden steps
     * @returns ImportEngine
     */
    setAvailableSteps(override) {
        if (Array.isArray(override) && override.length > 0) {
            this.availableSteps = override;
        }

        return this;
    }

    /**
     * Append new step to the specified position
     *
     * @param name string step name
     * @param position number? position to insert into
     * @returns ImportEngine
     */
    addStep(name, position) {
        if (position) {
            this.availableSteps.splice(position, 0, name);
        } else {
            this.availableSteps.push(name);
        }

        return this;
    }

    /**
     * Execute processing steps
     * Order of execution is defined by the order of step names in this.activatedSteps array
     *
     * @param options any given CLI arguments
     * @param activatedSteps Array<string> optional override for import steps
     * @return {Promise}
     */
    execute(options, activatedSteps) {
        return new Promise(((resolve, reject) => {
            try {
                // first step is to register external import implementations
                this.registerImporters(options);

                let steps = [];

                // apply override
                if (Array.isArray(activatedSteps) && activatedSteps.length > 0) {
                    steps = this.availableSteps.filter(item => activatedSteps.indexOf(item) !== -1);
                }

                // if no override was given, proceed with defaults
                // note: these default might have been extended within registerImporters()
                if (steps.length === 0) {
                    steps = Array.apply([], this.availableSteps);
                }

                /**
                 * Execution order: by step and by external import implementation
                 * Cancellation: useful when the whole execution procedure must be stopped intentionally
                 *
                 * Example flow:
                 * Steps: ['applyPatches', 'registerDependencies']
                 * Importers: [ImportBase, MyCustomImport, SecondCustomImport]
                 *
                 * 1. Step: applyPatches
                 *
                 *    Order:
                 *      1. ImportBase.applyPatches()
                 *      2. MyCustomImport <-- applyPatches() cannot be found, skipping
                 *      3. SecondCustomImport.applyPatches()
                 *
                 * 2. Step: registerDependencies
                 *    Order:
                 *      1. ImportBase.applyPatches()
                 *      2. MyCustomImport.registerDependencies()
                 *      3. SecondCustomImport <-- registerDependencies() cannot be found, skipping
                 */
                let tasks = [],
                    checkState = (state) => {
                        if (state === stepStates.cancelled) {
                            throw new Error(`Cancelled at ${step}`);
                        }
                    };
                
                for (let step of steps) {
                    for (let customImporter of this.customImporters) {
                        if (customImporter[step] instanceof Function) {
                            tasks.push(customImporter[step].bind(customImporter));
                        }
                    }
                }

                Promise.each(tasks, (task) => {
                    let result = task();
                    if (result && result.then) {
                        return result.then(checkState);
                    } else {
                        checkState(result);
                    }
                })
                .then(() => resolve(true))
                .catch(e => reject(e));
                
            } catch (e) {
                reject(e);
            }
        }).bind(this));
    }

    /**
     * Register supplied custom Importers
     *
     * @param options any given CLI arguments
     */
    registerImporters(options) {
        let projectInfo = {
            projectRoot: path.join(__dirname, '..', '..', '..')
        };

        for (let importer of this.customImporters) {
            if (importer.register) {
                importer.register(this, options, projectInfo);
            }
        }
    }
};

