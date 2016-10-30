"use strict";

module.exports = class {

    constructor(projectConfig, definitionConfig, customImporters) {
        if (!projectConfig) {
            throw new Error(`Project configuration isn't given or empty.`);
        }

        this.projectConfig = projectConfig;
        this.definitionConfig = definitionConfig;
        this.availableSteps = ['applyPatches', 'registerDependencies', 'registerBundles', 'saveProject', 'installTasks', 'executeScripts'];

        this.customImporters = customImporters || [];
    }

    setAvailableSteps(override) {
        if (Array.isArray(override) && override.length > 0) {
            this.availableSteps = override;
        }

        return this;
    }

    addStep(name) {
        this.availableSteps.push(name);

        return this;
    }

    execute(options, activatedSteps) {
        return new Promise(((resolve, reject) => {
            try {
                this.registerImporters(options);

                let steps = [];

                if (Array.isArray(activatedSteps) && activatedSteps.length > 0) {
                    steps = this.availableSteps.filter(item => activatedSteps.indexOf(item) !== -1);
                }

                if (steps.length === 0) {
                    steps = Array.apply([], this.availableSteps);
                }

                for (let step of steps) {
                    for (let customImporter of this.customImporters) {
                        if (customImporter[step] instanceof Function) {
                            customImporter[step]();
                        }
                    }
                }

                resolve(true);
            } catch (e) {
                reject(e);
            }
        }).bind(this));
    }

    registerImporters(options) {
        for (let importer of this.customImporters) {
            if (importer.register) {
                importer.register(this, options);
            }
        }
    }
};

