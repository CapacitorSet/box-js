# Based on the Irma processing plugin for Cuckoo, which is licensed GPLv3.
# See https://github.com/cuckoosandbox/cuckoo/blob/master/docs/LICENSE for the license text.

import logging
import time
import urlparse
import requests

from cuckoo.common.abstracts import Processing
from cuckoo.common.exceptions import CuckooOperationalError
from cuckoo.common.files import Files

log = logging.getLogger(__name__)

class BoxJS(Processing):

    def _request_text(self, url, **kwargs):
        """Wrapper around doing a request and parsing its text output."""
        try:
            r = requests.get(url, timeout=self.timeout, **kwargs)
            return r.text() if r.status_code == 200 else {}
        except (requests.ConnectionError, ValueError) as e:
            raise CuckooOperationalError(
                "Unable to GET results: %r" % e.message
            )

    def _request_json(self, url, **kwargs):
        """Wrapper around doing a request and parsing its JSON output."""
        try:
            r = requests.get(url, timeout=self.timeout, **kwargs)
            return r.json() if r.status_code == 200 else {}
        except (requests.ConnectionError, ValueError) as e:
            raise CuckooOperationalError(
                "Unable to GET results: %r" % e.message
            )

    def _post_text(self, url, **kwargs):
        """Wrapper around doing a post and parsing its text output."""
        try:
            r = requests.post(url, timeout=self.timeout, **kwargs)
            return r.text() if r.status_code == 200 else {}
        except (requests.ConnectionError, ValueError) as e:
            raise CuckooOperationalError(
                "Unable to POST to the API server: %r" % e.message
            )

    def _post_json(self, url, **kwargs):
        """Wrapper around doing a post and parsing its JSON output."""
        try:
            r = requests.post(url, timeout=self.timeout, **kwargs)
            return r.json() if r.status_code == 200 else {}
        except (requests.ConnectionError, ValueError) as e:
            raise CuckooOperationalError(
                "Unable to POST to the API server: %r" % e.message
            )

    def run(self):
        self.key = "boxjs"

        """ Fall off if we don't deal with files """
        if self.results.get("info", {}).get("category") != "file":
            log.debug("Box-js supports only file scanning!")
            return {}

        self.url = self.options.get("url")
        self.timeout = int(self.options.get("timeout", 60))

        # Post file for scanning.
        files = {
            "sample": open(self.file_path, "rb"),
        }
        postUrl = urlparse.urljoin(self.url, "/sample")
        analysis_id = self._post_text(postUrl, files=files,) # returns a UUID

        baseUrl = urlparse.urljoin(self.url, "/sample/" + analysis_id)

        # Wait for the analysis to be completed.
        done = False
        while not done:
            time.sleep(1)
            if self._request_text(baseUrl) == "1":
                done = True

        # Fetch the results.
        results["urls"] = self._request_json(urlparse.urljoin(baseUrl, "/urls"))
        results["resources"] = self._request_json(urlparse.urljoin(baseUrl, "/resources"))

        # Delete the results.
        try:
            requests.delete(urlparse.urljoin(baseUrl), timeout=self.timeout)
        except (requests.ConnectionError, ValueError) as e:
            raise CuckooOperationalError(
                "Unable to send a DELETE request: %r" % e.message
            )

        return results
