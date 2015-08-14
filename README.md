# WordPress Update

Uses `grunt-ssh` and `grunt-wordpress-deploy` to automatically clean and download a WordPress installation from a remote server(s), update locally, and re-deploy.

* Will delete any WordPress repository (github.com/WordPress/WordPress.git) from server.
* Will backup (to `../private`) and safely delete any Capistrano installation from server.

## Example Gruntfile.js:
```javascript
module.exports = function(grunt) {
  'use strict';
 
  grunt.initConfig({
    wordpressupdate: {
      git_repo: null, // Optional Git repo URL
      servers: {
        local: {
          "title": "local",
          "database": "database_name",
          "user": "database_username",
          "pass": "database_password",
          "host": "database_host",
          "url": "http://local_url",
          "path": "/local_path",
        },
        staging: {
          "title": "staging",
          "database": "database_name",
          "user": "database_username",
          "pass": "database_password",
          "host": "database_host",
          "url": "http://staging_url",
          "path": "/staging_path",
          "ssh_host": "staging_host",
          "ssh_user": "staging_user",
          "git_branch": "staging",
        },
        production: {
          "title": "production",
          "database": "database_name",
          "user": "database_username",
          "pass": "database_password",
          "host": "database_host",
          "url": "http://production_url",
          "path": "/production_path",
          "ssh_host": "production_host",
          "ssh_user": "production_user",
          "git_branch": "master",
        }
      },
    },
  });
 
  // Load WordPress Updater
  var updater = require('grunt-wordpress-update');
  updater(grunt);
 
  // Register default task 
  grunt.registerTask('default', [
    'sshexec:git_status'
  ]);
};
```
