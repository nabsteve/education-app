# Backend framework for an education web app.

## Setting up the Application
* For the app to run properly you'd need to create a .env file.
* The .env file should be located on the same directory as the index.js.
* In your .env file, create two things, `SECRET_KEY` and `MONGO_SERVER` variables.
* The `SECRET_KEY` should be a random text that is would be hard to guess, e.g. `SECRET_KEY=This is the secret key I want to use for the API application.`
* The `MONGO_SERVER` can either be a localhost server, a remote server or both.
* You'd need to install all npm modules using `npm i`.

## Application Description
This application is the backedn logic for an education app.
It makes use of JSON Web Tokens (JWT) for authentication middleware.

This app allows new users register and old users login. 
There are two kinds of users: 
1. Teachers, The are able to do the following:
   * Answer questions.
   * Verifiy if an answered question is right or wrong.
   * Create a new subject.
   * Create a new topic.
2. Students, They are able to do the following:
   * Answer questions.
   * Create questions


#### All routes were working perfectly as at time of upload.
#### Tests were conducted using Postman app
