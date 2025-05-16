import os
import logging
import requests
import time
import threading
from typing import Dict, Optional, Union
import re
logger = logging.getLogger("RagaAICatalyst")
logging_level = (
    logger.setLevel(logging.DEBUG) if os.getenv("DEBUG") == "1" else logging.INFO
)

class RagaAICatalyst:
    BASE_URL = None
    TIMEOUT = 10  # Default timeout in seconds
    TOKEN_EXPIRY_TIME = 6  # Default token expiration time (6 hours in hours)

    def __init__(
        self,
        access_key,
        secret_key,
        api_keys: Optional[Dict[str, str]] = None,
        base_url: Optional[str] = None,
        token_expiry_time: Optional[float] = 6,
    ):
        """
        Initializes a new instance of the RagaAICatalyst class.

        Args:
            access_key (str): The access key for the RagaAICatalyst.
            secret_key (str): The secret key for the RagaAICatalyst.
            api_keys (Optional[Dict[str, str]]): A dictionary of API keys for different services. Defaults to None.
            base_url (Optional[str]): The base URL for the RagaAICatalyst API. Defaults to None.
            token_expiry_time (Optional[float]): The time in hours before the token expires. Defaults to 0.1 hours.

        Raises:
            ValueError: If the RAGAAI_CATALYST_ACCESS_KEY and RAGAAI_CATALYST_SECRET_KEY environment variables are not set.
            ConnectionError: If the provided base_url is not accessible.

        Returns:
            None
        """

        if not access_key or not secret_key:
            logger.error(
                "RAGAAI_CATALYST_ACCESS_KEY and RAGAAI_CATALYST_SECRET_KEY environment variables must be set"
            )
            raise ValueError(
                "RAGAAI_CATALYST_ACCESS_KEY and RAGAAI_CATALYST_SECRET_KEY environment variables must be set"
            )

        self.access_key, self.secret_key = self._set_access_key_secret_key(
            access_key, secret_key
        )

        # Initialize token management
        self._token_expiry = None
        self._token_refresh_lock = threading.Lock()
        self._refresh_thread = None
        
        # Set token expiration time (convert hours to seconds)
        RagaAICatalyst.TOKEN_EXPIRY_TIME = token_expiry_time * 60 * 60

        RagaAICatalyst.BASE_URL = (
            os.getenv("RAGAAI_CATALYST_BASE_URL")
            if os.getenv("RAGAAI_CATALYST_BASE_URL")
            else "https://catalyst.raga.ai/api"
        )

        self.api_keys = api_keys or {}

        if base_url:
            RagaAICatalyst.BASE_URL = self._normalize_base_url(base_url)
            try:
                #set the os.environ["RAGAAI_CATALYST_BASE_URL"] before getting the token as it is used in the get_token method
                os.environ["RAGAAI_CATALYST_BASE_URL"] = RagaAICatalyst.BASE_URL
                self.get_token()
            except requests.exceptions.RequestException:
                raise ConnectionError(
                    "The provided base_url is not accessible. Please re-check the base_url."
                )
        else:
            # Get the token from the server
            self.get_token()

        # Set the API keys, if  available
        if self.api_keys:
            self._upload_keys()

    @staticmethod
    def _normalize_base_url(url):
        url = re.sub(r'(?<!:)//+', '/', url)  # Ignore the `://` part of URLs and remove extra // if any
        url = url.rstrip("/") # To remove trailing slashes
        if not url.endswith("/api"): # To ensure it ends with /api
            url = f"{url}/api"
        return url

    def _set_access_key_secret_key(self, access_key, secret_key):
        os.environ["RAGAAI_CATALYST_ACCESS_KEY"] = access_key
        os.environ["RAGAAI_CATALYST_SECRET_KEY"] = secret_key

        return access_key, secret_key

    def _upload_keys(self):
        """
        Uploads API keys to the server for the RagaAICatalyst.

        This function uploads the API keys stored in the `api_keys` attribute of the `RagaAICatalyst` object to the server. It sends a POST request to the server with the API keys in the request body. The request is authenticated using a bearer token obtained from the `RAGAAI_CATALYST_TOKEN` environment variable.

        Parameters:
            None

        Returns:
            None

        Raises:
            ValueError: If the `RAGAAI_CATALYST_ACCESS_KEY` or `RAGAAI_CATALYST_SECRET_KEY` environment variables are not set.

        Side Effects:
            - Sends a POST request to the server.
            - Prints "API keys uploaded successfully" if the request is successful.
            - Logs an error message if the request fails.

        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.getenv('RAGAAI_CATALYST_TOKEN')}",
        }
        secrets = [
            {"type": service, "key": service, "value": key}
            for service, key in self.api_keys.items()
        ]
        json_data = {"secrets": secrets}
        start_time = time.time()
        endpoint = f"{RagaAICatalyst.BASE_URL}/v1/llm/secrets/upload"
        response = requests.post(
            endpoint,
            headers=headers,
            json=json_data,
            timeout=RagaAICatalyst.TIMEOUT,
        )
        elapsed_ms = (time.time() - start_time) * 1000
        logger.debug(
            f"API Call: [POST] {endpoint} | Status: {response.status_code} | Time: {elapsed_ms:.2f}ms")
        if response.status_code == 200:
            print("API keys uploaded successfully")
        else:
            logger.error("Failed to upload API keys")

    def add_api_key(self, service: str, key: str):
        """Add or update an API key for a specific service."""
        self.api_keys[service] = key

    def get_api_key(self, service: str) -> Optional[str]:
        """Get the API key for a specific service."""
        return self.api_keys.get(service)

    # Token expiration time is now configurable via the token_expiry_time parameter
    # Default is 6 hours, but can be changed to 23 hours or any other value

    def _get_credentials(self) -> tuple[str, str]:
        """Get access key and secret key from instance or environment."""
        access_key = self.access_key or os.getenv("RAGAAI_CATALYST_ACCESS_KEY")
        secret_key = self.secret_key or os.getenv("RAGAAI_CATALYST_SECRET_KEY")
        return access_key, secret_key

    def _refresh_token_async(self):
        """Refresh token in background thread."""
        try:
            self.get_token(force_refresh=True)
        except Exception as e:
            logger.error(f"Background token refresh failed: {str(e)}")
            
    def _schedule_token_refresh(self):
        """Schedule a token refresh to happen 20 seconds before expiration."""
        if not self._token_expiry:
            return
            
        # Calculate when to refresh (20 seconds before expiration)
        current_time = time.time()
        refresh_buffer = min(20, RagaAICatalyst.TOKEN_EXPIRY_TIME * 0.05)  # 20 seconds or 5% of expiry time, whichever is smaller
        time_until_refresh = max(self._token_expiry - current_time - refresh_buffer, 1)  # At least 1 second
        
        def delayed_refresh():
            # Sleep until it's time to refresh
            time.sleep(time_until_refresh)
            logger.debug(f"Scheduled token refresh triggered")
            self._refresh_token_async()
            
        # Start a new thread for the delayed refresh
        if not self._refresh_thread or not self._refresh_thread.is_alive():
            self._refresh_thread = threading.Thread(target=delayed_refresh)
            self._refresh_thread.daemon = True
            self._refresh_thread.start()
            logger.debug(f"Token refresh scheduled in {time_until_refresh:.1f} seconds")

    def get_token(self, force_refresh=False) -> Union[str, None]:
        """
        Retrieves or refreshes a token using the provided credentials.

        Args:
            force_refresh (bool): If True, forces a token refresh regardless of expiration.

        Returns:
            - A string representing the token if successful.
            - None if credentials are not set or if there is an error.
        """
        with self._token_refresh_lock:
            current_token = os.getenv("RAGAAI_CATALYST_TOKEN")
            current_time = time.time()

            # Check if we need to refresh the token
            if not force_refresh and current_token and self._token_expiry and current_time < self._token_expiry:
                return current_token

            access_key, secret_key = self._get_credentials()
            if not access_key or not secret_key:
                logger.error("Access key or secret key is not set")
                return None

            headers = {"Content-Type": "application/json"}
            json_data = {"accessKey": access_key, "secretKey": secret_key}

            start_time = time.time()
            endpoint = f"{self.BASE_URL}/token"
            response = requests.post(
                endpoint,
                headers=headers,
                json=json_data,
                timeout=self.TIMEOUT,
            )
            elapsed_ms = (time.time() - start_time) * 1000
            logger.debug(
                f"API Call: [POST] {endpoint} | Status: {response.status_code} | Time: {elapsed_ms:.2f}ms")

            # Handle specific status codes before raising an error
            if response.status_code == 400:
                token_response = response.json()
                if token_response.get("message") == "Please enter valid credentials":
                    raise Exception(
                        "Authentication failed. Invalid credentials provided. Please check your Access key and Secret key. \nTo view or create new keys, navigate to Settings -> Authenticate in the RagaAI Catalyst dashboard."
                    )

            response.raise_for_status()
            token_response = response.json()

            if not token_response.get("success", False):
                logger.error(
                    "Token retrieval was not successful: %s",
                    token_response.get("message", "Unknown error"),
                )
                return None

            token = token_response.get("data", {}).get("token")
            if token:
                os.environ["RAGAAI_CATALYST_TOKEN"] = token
                self._token_expiry = time.time() + RagaAICatalyst.TOKEN_EXPIRY_TIME
                logger.debug(f"Token refreshed successfully. Next refresh in {RagaAICatalyst.TOKEN_EXPIRY_TIME/3600:.1f} hours")
                
                # Schedule token refresh 20 seconds before expiration
                self._schedule_token_refresh()
                
                return token
            else:
                logger.error("Token(s) not set")
                return None

    def ensure_valid_token(self) -> Union[str, None]:
        """
        Ensures a valid token is available, with different handling for missing token vs expired token:
        - Missing token: Synchronous retrieval (fail fast)
        - Expired token: Synchronous refresh (since token is needed immediately)

        Returns:
            - A string representing the valid token if successful.
            - None if unable to obtain a valid token.
        """
        current_token = os.getenv("RAGAAI_CATALYST_TOKEN")
        current_time = time.time()

        # Case 1: No token - synchronous retrieval (fail fast)
        if not current_token:
            return self.get_token(force_refresh=True)

        # Case 2: Token expired - synchronous refresh (since we need a valid token now)
        if not self._token_expiry or current_time >= self._token_expiry:
            logger.info("Token expired, refreshing synchronously")
            return self.get_token(force_refresh=True)
            
        # Case 3: Token valid but approaching expiry (less than 10% of lifetime remaining)
        # Start background refresh but return current token
        token_remaining_time = self._token_expiry - current_time
        if token_remaining_time < (RagaAICatalyst.TOKEN_EXPIRY_TIME * 0.1):
            if not self._refresh_thread or not self._refresh_thread.is_alive():
                logger.info("Token approaching expiry, starting background refresh")
                self._refresh_thread = threading.Thread(target=self._refresh_token_async)
                self._refresh_thread.daemon = True
                self._refresh_thread.start()

        # Return current token (which is valid)
        return current_token

    def get_auth_header(self) -> Dict[str, str]:
        """
        Returns a dictionary containing the Authorization header with a valid token.
        This method should be used instead of directly accessing os.getenv("RAGAAI_CATALYST_TOKEN").

        Returns:
            - A dictionary with the Authorization header if successful.
            - An empty dictionary if no valid token could be obtained.
        """
        token = self.ensure_valid_token()
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}

    def project_use_cases(self):
        try:
            headers = self.get_auth_header()
            start_time = time.time()
            endpoint = f"{RagaAICatalyst.BASE_URL}/v2/llm/usecase"
            response = requests.get(
                endpoint,
                headers=headers,
                timeout=self.TIMEOUT
            )
            elapsed_ms = (time.time() - start_time) * 1000
            logger.debug(
                f"API Call: [GET] {endpoint} | Status: {response.status_code} | Time: {elapsed_ms:.2f}ms")
            response.raise_for_status()  # Use raise_for_status to handle HTTP errors
            usecase = response.json()["data"]["usecase"]
            return usecase
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to retrieve project use cases: {e}")
            return []

    def create_project(self, project_name, usecase="Q/A", type="llm"):
        """
        Creates a project with the given project_name, type, and description.

        Parameters:
            project_name (str): The name of the project to be created.
            type (str, optional): The type of the project. Defaults to "llm".
            description (str, optional): Description of the project. Defaults to "".

        Returns:
            str: A message indicating the success or failure of the project creation.
        """
        # Check if the project already exists
        existing_projects = self.list_projects()
        if project_name in existing_projects:
            raise ValueError(f"Project name '{project_name}' already exists. Please choose a different name.")

        usecase_list = self.project_use_cases()
        if usecase not in usecase_list:
            raise ValueError(f"Select a valid usecase from {usecase_list}")
        
        json_data = {"name": project_name, "type": type, "usecase": usecase}
        headers = {
            "Content-Type": "application/json",
            "Authorization": f'Bearer {os.getenv("RAGAAI_CATALYST_TOKEN")}',
        }
        try:
            start_time = time.time()
            endpoint = f"{RagaAICatalyst.BASE_URL}/v2/llm/project"
            response = requests.post(
                endpoint,
                headers=headers,
                json=json_data,
                timeout=self.TIMEOUT,
            )
            elapsed_ms = (time.time() - start_time) * 1000
            logger.debug(
                f"API Call: [POST] {endpoint} | Status: {response.status_code} | Time: {elapsed_ms:.2f}ms")
            response.raise_for_status()
            print(
                f"Project Created Successfully with name {response.json()['data']['name']} & usecase {usecase}"
            )
            return f'Project Created Successfully with name {response.json()["data"]["name"]} & usecase {usecase}'

        except requests.exceptions.HTTPError as http_err:
            if response.status_code == 401:
                logger.warning("Received 401 error. Attempting to refresh token.")
                self.get_token()
                headers["Authorization"] = (
                    f'Bearer {os.getenv("RAGAAI_CATALYST_TOKEN")}'
                )
                try:
                    response = requests.post(
                        f"{RagaAICatalyst.BASE_URL}/v2/llm/project",
                        headers=headers,
                        json=json_data,
                        timeout=self.TIMEOUT,
                    )
                    response.raise_for_status()
                    print(
                        "Project Created Successfully with name %s after token refresh",
                        response.json()["data"]["name"],
                    )
                    return f'Project Created Successfully with name {response.json()["data"]["name"]}'
                except requests.exceptions.HTTPError as refresh_http_err:
                    logger.error(
                        "Failed to create project after token refresh: %s",
                        str(refresh_http_err),
                    )
                    return f"Failed to create project: {response.json().get('message', 'Authentication error after token refresh')}"
            else:
                logger.error("Failed to create project: %s", str(http_err))
                return f"Failed to create project: {response.json().get('message', 'Unknown error')}"
        except requests.exceptions.Timeout as timeout_err:
            logger.error(
                "Request timed out while creating project: %s", str(timeout_err)
            )
            return "Failed to create project: Request timed out"
        except Exception as general_err1:
            logger.error(
                "Unexpected error while creating project: %s", str(general_err1)
            )
            return "An unexpected error occurred while creating the project"

    def get_project_id(self, project_name):
        pass

    def list_projects(self, num_projects=99999):
        """
        Retrieves a list of projects with the specified number of projects.

        Parameters:
            num_projects (int, optional): Number of projects to retrieve. Defaults to 100.

        Returns:
            list: A list of project names retrieved successfully.
        """
        headers = {
            "Authorization": f'Bearer {os.getenv("RAGAAI_CATALYST_TOKEN")}',
        }
        try:
            start_time = time.time()
            endpoint = f"{RagaAICatalyst.BASE_URL}/v2/llm/projects?size={num_projects}"
            response = requests.get(
                endpoint,
                headers=headers,
                timeout=self.TIMEOUT,
            )
            elapsed_ms = (time.time() - start_time) * 1000
            logger.debug(
                f"API Call: [GET] {endpoint} | Status: {response.status_code} | Time: {elapsed_ms:.2f}ms")
            response.raise_for_status()
            logger.debug("Projects list retrieved successfully")

            project_list = [
                project["name"] for project in response.json()["data"]["content"]
            ]

            return project_list
        except requests.exceptions.HTTPError as http_err:
            if response.status_code == 401:
                logger.warning("Received 401 error. Attempting to refresh token.")
                self.get_token()
                headers["Authorization"] = (
                    f'Bearer {os.getenv("RAGAAI_CATALYST_TOKEN")}'
                )
                try:
                    response = requests.get(
                        f"{RagaAICatalyst.BASE_URL}/v2/llm/projects",
                        headers=headers,
                        timeout=self.TIMEOUT,
                    )
                    response.raise_for_status()
                    logger.debug(
                        "Projects list retrieved successfully after token refresh"
                    )
                    project_df = pd.DataFrame(
                        [
                            {"project": project["name"]}
                            for project in response.json()["data"]["content"]
                        ]
                    )
                    return project_df

                except requests.exceptions.HTTPError as refresh_http_err:
                    logger.error(
                        "Failed to list projects after token refresh: %s",
                        str(refresh_http_err),
                    )
                    return f"Failed to list projects: {response.json().get('message', 'Authentication error after token refresh')}"
            else:
                logger.error("Failed to list projects: %s", str(http_err))
                return f"Failed to list projects: {response.json().get('message', 'Unknown error')}"
        except requests.exceptions.Timeout as timeout_err:
            logger.error(
                "Request timed out while listing projects: %s", str(timeout_err)
            )
            return "Failed to list projects: Request timed out"
        except Exception as general_err2:
            logger.error(
                "Unexpected error while listing projects: %s", str(general_err2)
            )
            return "An unexpected error occurred while listing projects"

    def list_metrics(self):
        return RagaAICatalyst.list_metrics()

    @staticmethod
    def list_metrics():
        headers = {
            "Content-Type": "application/json",
            "Authorization": f'Bearer {os.getenv("RAGAAI_CATALYST_TOKEN")}',
        }
        try:
            start_time = time.time()
            endpoint = f"{RagaAICatalyst.BASE_URL}/v1/llm/llm-metrics"
            response = requests.get(
                endpoint,
                headers=headers,
                timeout=RagaAICatalyst.TIMEOUT,
            )
            elapsed_ms = (time.time() - start_time) * 1000
            logger.debug(
                f"API Call: [GET] {endpoint} | Status: {response.status_code} | Time: {elapsed_ms:.2f}ms")
            response.raise_for_status()
            logger.debug("Metrics list retrieved successfully")

            metrics = response.json()["data"]["metrics"]
            # For each dict in metric only return the keys: `name`, `category`
            sub_metrics = [metric["name"] for metric in metrics]
            return sub_metrics

        except requests.exceptions.HTTPError as http_err:
            if response.status_code == 401:
                logger.warning("Received 401 error. Attempting to refresh token.")
                self.get_token()
                headers["Authorization"] = (
                    f'Bearer {os.getenv("RAGAAI_CATALYST_TOKEN")}'
                )
                try:
                    response = requests.get(
                        f"{RagaAICatalyst.BASE_URL}/v1/llm/llm-metrics",
                        headers=headers,
                        timeout=self.TIMEOUT,
                    )
                    response.raise_for_status()
                    logger.debug(
                        "Metrics list retrieved successfully after token refresh"
                    )
                    metrics = [
                        project["name"]
                        for project in response.json()["data"]["metrics"]
                    ]
                    # For each dict in metric only return the keys: `name`, `category`
                    sub_metrics = [
                        {
                            "name": metric["name"],
                            "category": metric["category"],
                        }
                        for metric in metrics
                    ]
                    return sub_metrics

                except requests.exceptions.HTTPError as refresh_http_err:
                    logger.error(
                        "Failed to list metrics after token refresh: %s",
                        str(refresh_http_err),
                    )
                    return f"Failed to list metrics: {response.json().get('message', 'Authentication error after token refresh')}"
            else:
                logger.error("Failed to list metrics: %s", str(http_err))
                return f"Failed to list metrics: {response.json().get('message', 'Unknown error')}"
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to list metrics: {e}")
            return []
