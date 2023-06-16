Webgx
=========
By Graham

A WebGPU player.

## Quick start

1. Clone the repo
2. Install dependencies with e.g. `npm install` or equivs
3. Run `npm start`

The server will run on port 8000 by default. Override with `PORT` environment variable.

## Overview

I adapted this from my (fairly bare-bones) WebGL shader art stack to a) familiarize myself with WebGPU, and b) continue my practice of doing shader art and related in a more modular way than e.g. just cloning and modifying single-page demos. It is obscure and idiosyncratic and I do not recommend anyone using it for any reason. Plz consult the WebGPU docs and write your own thing.

In a nutshell, we load a "program" file specified in the `program` or `p` query parameter, which defines a set of WebGPU pipelines and logic to perform at every step of the animation. The shaders are defined in separately files, using a fairly rudimentary `#include` system, according to a directory schema that made sense when I first started using it a few years ago. Unlike in my WebGL thing, which just used JSON, the program files here are full JavaScript files which include functions, etc., including access to a program object passed in from the player.

There are separate directories for builtin programs and shaders (`lib`) and user-defined ones (`user`). The server process is required to both retrieve resources from both of these potential paths as well as perform recording operations via ffmpeg and simple frame saving.

There is very little error handling being performed and the player is not in any way robust. It simply plays properly-formatted program and shader files for output or &mdash; within reason &mdash; interactive display. Probably.