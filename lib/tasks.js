"use strict";

/**
 * Copy a custom CLI task into `aurelia_project/tasks` folder
 *
 * @param taskName string
 * @param project object aurelia.json config
 * @return {Promise}
 */
let installTask = (taskName, project) => {
    return new Promise((resolve, reject) => {
        try {
            let fs = require('fs-extra'),
                path = require('path'),
                projectFolder = 'aurelia_project/',
                installName = taskName;

            // determinate transpiler to set correct file extension
            let filename = installName + project.transpiler.fileExtension,
                source = path.resolve(__dirname, `../tasks/${installName}`),
                dest = `${projectFolder}tasks/`,
                destFile = dest + filename;

            fs.exists(`${source}.js`, (exists) => {
                if (exists) {
                    fs.copy(`${source}.js`, destFile, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            fs.exists(`${source}.json`, (exists) => {
                                if (exists) {
                                    fs.copy(`${source}.json`, `${dest + installName}.json`, (err) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(true);
                                        }
                                    });
                                } else {
                                    resolve(true);
                                }
                            });
                        }
                    });
                } else {
                    reject(`${source}.js could not be found.`);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * Batch method: copy all defined custom CLI tasks into `aurelia_project/tasks` folder
 *
 * @param tasks string[] task names
 * @param project object aurelia.json config
 * @param action string install/uninstall
 * @return {Promise}
 */
let installTasks = (tasks, project, action) => {
    return new Promise((resolve, reject) => {
        let proms = [];

        for (let task of tasks) {
            if (action === 'install') {
                let prom = installTask(task, project)
                    .then(ok => console.log(`[INFO] Custom task: ${task} has been installed.`))
                    .catch(e => console.log(`[ERR] An error occurred during task copy: ${task}`, e));

                proms.push(prom);
            } else {
                //TODO: task removal
            }
        }

        return Promise.all(proms)
            .then(() => resolve(true))
            .catch(e => reject(e));
    });
};

exports.installTasks = installTasks;
