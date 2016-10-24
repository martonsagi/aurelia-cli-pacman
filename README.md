#**Experimental:** this project is a work in progress.

# aurelia-cli-pacman

> Aurelia-cli-pacman is a simple package management helper for projects using [aurelia-cli](http://github.com/aurelia/cli). It supports npm package installation/removal, and configuration of pre-defined bundle dependencies in `aurelia.json`. This project's main goal is to enhance the package/plugin configuration process while using `aurelia-cli` for development.

## 1. Installation

Since it's an extension to aurelia-cli, it cannot be used with JSPM or WebPack.

```
npm install aurelia-cli-pacman --save
```

### 1.1 `pacman` helper task for aurelia-cli

Since aurelia-cli is still in alpha stage and `install` command is not yet implemented, I've created this custom cli task to enhance configuration of plugin dependencies in `aurelia.json`. It adds a pre-configured set of dependencies to `aurelia.json`, if there's any. 
A post-install npm script takes care of placing this new `pacman.ts|js` task into `aurelia_project/tasks` folder.
 
## 2. Usage
 
| Parameters | Description |
| ------------------- | ----------- |
| --install, i <bundle-file.js> | Install npm package and sets bundle dependencies. Calls `npm install --save` |
| --uninstall, u <bundle-file.js> | Uninstall npm package and removes bundle dependencies. Calls `npm uninstall --save` |
| --bundle, b <bundle-file.js> | Set bundle section to be modified |
| --force, f | Overwrite previously set dependencies (applies only to dependencies of specified package! It won't delete the whole bundle setting.) |

Run `au pacman` helper:

```
au pacman --install <package name> [--bunde <custom-bundle-filename>] [--force]
au pacman i aurelia-validation --bunde plugin-bundle.js --force

au pacman u aurelia-validation
```

**Note:** tested on Windows platform only.

### 2.1 Pre-defined bundle dependencies

There is a small dependency collection for several basic aurelia plugins and other npm packages in `./registry` folder.

## 3. Dependencies

* aurelia-cli
* fs-extra


## 4. Platform Support

This extension can be used with **NodeJS** only. It's executed within `aurelia-cli` infrastructure.

