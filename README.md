# WordPress Update

Uses `grunt-ssh` and `grunt-wordpress-deploy` to automatically clean and download a WordPress installation from a remote server(s), update locally, and re-deploy.

* Will delete any WordPress repository (github.com/WordPress/WordPress.git) from server.
* Will backup (to `../private`) and safely delete any Capistrano installation from server.
