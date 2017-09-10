# Integrations

## Cuckoo, Malwr, VirusTotal

You can automatically submit the results of an analysis to a Cuckoo sandbox, Malwr or VirusTotal. Run `box-export --help` (or `node integrations/export/export.js --help`) for more information.

## Docker

You might want to run the analysis in a temporary Docker container in order to isolate the process. This has positive security implications: although box-js already uses a hardened sandbox, Docker provides another stronger level of isolation.

You can use the provided Dockerfile, in `integrations/docker`:

```
docker build -t box-js .
```

And then run the analysis like this:

```
docker run --rm --volume /tmp/samplecollection:/samples box-js box-js /samples --output-dir=/samples --loglevel=debug
```

This does the following:

 * `docker run ... box-js` run the container called `box-js` which you previously created;
 * `--rm` specifies that the container filesystem should be destroyed when the analysis finishes;
 * `--volume /tmp/samplecollection:/samples` means that your folder `/tmp/samplecollection` will be mounted as `/samples` inside the container. Take special care not to expose sensitive files!
 * `box-js /samples --output-dir=/samples --loglevel=debug` is the command to be executed. It will analyze all files in /samples (i.e. in /tmp/samplecollection), write results to /samples/<filename>.results, and print all log messages, including debug ones.

>Of course, you can use whichever flags you want, eg. `--download --timeout=120`.

When the analysis terminates, you will find the results in /tmp/samplescollection, where you can analyze them by yourself or with `box-export`.

## REST API

>This section is a work-in-progress.

Box-js includes a small REST API for uploading samples. To use it, install Hapi and rimraf (`npm install hapi rimraf`) and run `node integrations/api/api.js`.

>The user running the API server must also be able to spawn Docker containers.

### Methods

 * `GET /concurrency`: returns an integer representing the concurrency, i.e. how many analyses to run at the same time at most.
 * `POST /concurrency` with parameter `value`: change the concurrency.
 * `GET /sample/{id}`: returns the status of the given analysis (1 if it's complete, 0 otherwise).
 * `POST /sample` with parameter `sample`, a file: enqueue the sample you uploaded. Returns the analysis ID (to be used with `GET /sample/{id}`).
 * `DELETE /sample/{id}`: delete the folder corresponding to the given sample. Should only be called after the analysis terminates.