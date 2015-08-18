/*
 * grunt-wordpress-update
 * https://github.com/TWGerard/grunt-wordpress-update
 *
 * Copyright (c) 2015 LRXD
 */

'use strict';

module.exports = function(grunt) {

  var sshconfig = {};
  var wordpressdeploy = {
    options: {
      backup_dir: "backups/",
      rsync_args: ['-rlpt', '--compress', '--omit-dir-times', '--delete'],
      exclusions: ['Gruntfile.js', '.git/', 'tmp/*', 'backups/', 'wp-config.php', '.htaccess', 'wp-content/uploads', 'wp-content/upgrade', 'cap/', 'composer.json', 'composer.lock', 'README.md', '.gitignore', 'package.json', 'node_modules']
    },
  };

  // Add servers to configs
  var servers = grunt.config.get('wordpressupdate')['servers'];
  var git_repo = grunt.config.get('wordpressupdate')['git_repo'];

  for (var s in servers) {
    var server = servers[s];
    sshconfig[server.title] = {
      host: server.ssh_host,
      username: server.ssh_user,
      agent: process.env.SSH_AUTH_SOCK,
      agentForward: true
    };
    wordpressdeploy[server.title] = server;
    if (server.ssh_user && server.ssh_host) {
      wordpressdeploy[server.title].ssh_host = server.ssh_user + "@" + server.ssh_host;
    }
  }

  // Skip repo stuff if we have a repo
  if (git_repo) {
    wordpressdeploy.options.exclusions.push("wp-content/themes");
    wordpressdeploy.options.exclusions.push("wp-content/plugins");
  }
 
  grunt.initConfig({
    git_repo: git_repo,
    wordpressupdate: grunt.config.get('wordpressupdate'),
    wordpressdeploy: wordpressdeploy,
    sshconfig: sshconfig,
    sshexec: {
      git_status: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + 'wp-content',
          'git status',
          'git remote -v'
        ].join(' && '),
        options: {
          callback: function(stdout) {
            console.log("CALLBACK");
            console.log(stdout);
          },
          config: (grunt.option('target') || task_options['target']),
        }
      },
      check_for_wp_repo: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path,
          'git remote -v'
        ].join(' && ' ),
        options: {
          callback: function(stdout) {
            if (stdout.indexOf("github.com/WordPress/WordPress.git") !== -1) {
              // we have a WP repo
              console.log("WP repo found");
              grunt.task.run('sshexec:delete_wp_repo');
            }
          },
          ignoreErrors: true,
          config: (grunt.option('target') || task_options['target']),
        }
      },
      delete_wp_repo: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path,
          'rm -rf .git'
        ].join(' && '),
        options: {
          config: (grunt.option('target') || task_options['target']),
        }
      },
      check_for_cap: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path,
          'ls -al cap/current'
        ].join(' && ' ),
        options: {
          callback: function(stdout) {
            if (stdout.indexOf("No such file or directory") === -1) {
              console.log("Found Capistrano");
              grunt.task.run('sshexec:clean_cap');
            }
          },
          ignoreErrors: true,
          config: (grunt.option('target') || task_options['target']),
        }
      },
      check_cap_repo_url: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + '/cap/shared/cached-copy',
          'git config --get remote.origin.url'
        ].join(' && ' ),
        options: {
          callback: function(stdout) {
            if (stdout !== git_repo) {
              throw "Capistrano has wrong git repo. Expected " + git_repo + ", found " + stdout;
            } else {
              grunt.task.run('sshexec:clean_cap');
            }
          },
          config: (grunt.option('target') || task_options['target']),
        }
      },
      clean_cap: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path,
          'rm -rf ../private/cap',
          'cp -r cap ../private/cap',
          'rm -rf wp-content',
          'cp -rL cap/current wp-content',
          'rm -rf wp-content/REVISION',
          'rm -rf wp-content/uploads',
          'mv cap/shared/uploads wp-content/uploads',
          'mv cap/shared/cached-copy/.git wp-content/.git',
          'mv cap/shared/cached-copy/.gitignore wp-content/.gitignore',
          'rm -rf cap'
        ].join(' && '),
        options: {
          config: (grunt.option('target') || task_options['target']),
        }
      },
      check_content_repo_url: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + 'wp-content',
          'git config --get remote.origin.url'
        ].join(' && '),
        options: {
          callback: function(stdout) {
            if (stdout !== git_repo) {
              throw grunt.option('target') + ' repo URL is ' + stdout + '. Expected ' + git_repo;
            } else {
              grunt.task.run('sshexec:check_content_repo_branch');
            }
            grunt.config('test', 'balls');
          },
          config: (grunt.option('target') || task_options['target']),
        }
      },
      check_content_repo_branch: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + 'wp-content',
          'git rev-parse --abbrev-ref HEAD'
        ].join(' && '),
        options: {
          callback: function(stdout) {
            var git_branch = servers[grunt.option('target')].git_branch;
            if (stdout !== git_branch) {
              throw 'Active branch on ' + grunt.option('target') + ' is ' + stdout + '. Expected ' + git_branch;
            } else {
              grunt.task.run('sshexec:check_content_repo');
            }
            grunt.config('test', 'balls');
          },
          config: (grunt.option('target') || task_options['target']),
        }
      },
      check_content_repo: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + 'wp-content',
          'git status'
        ].join(' && '),
        options: {
          callback: function(stdout) {
            if (stdout !== "nothing to commit (working directory clean)") {
              throw 'Uncommited changes on ' + grunt.option('target')
            } else {
              grunt.task.run('sshexec:check_content_repo_diff');
            }
          },
          config: (grunt.option('target') || task_options['target']),
        }
      },
      check_content_repo_diff: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + 'wp-content',
          'git remote update',
          'git diff origin/' + servers[grunt.option('target')].git_branch + ' --raw | cat'
        ].join(' && '),
        options: {
          callback: function(stdout) {
            if (stdout !== "" && stdout !== "Fetching origin") {
              console.log(stdout);
              grunt.fail.warn('Unpushed changes on ' + grunt.option('target'), 6);
            }
          },
          config: (grunt.option('target') || task_options['target']),
        }
      },
      push_content_repo: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + 'wp-content',
          ''
        ].join(' && '),
        options: {
          config: (grunt.option('target') || task_options['target']),
        }
      },
      pull_content_repo: {
        command: [
          'cd ' + servers[(grunt.option('target') || task_options['target'])].path + 'wp-content',
          'git remote update',
          'git checkout ' + servers[grunt.option('target')].git_branch,
          'git pull origin ' + servers[grunt.option('target')].git_branch
        ].join(' && '),
        options: {
          config: (grunt.option('target') || task_options['target']),
        }
      },
    }
  });

  // Loud our tasks
  grunt.loadTasks('node_modules/grunt-wordpress-update/tasks');
 
  // Load dependancy tasks
  grunt.loadTasks('node_modules/grunt-wordpress-update/node_modules/grunt-wordpress-deploy/tasks');
  grunt.loadTasks('node_modules/grunt-wordpress-update/node_modules/grunt-ssh/tasks');
 
  // Register default task
  grunt.registerTask('default', ['sshexec:git_status']);

};