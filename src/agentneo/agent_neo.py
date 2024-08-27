import requests
from typing import Optional, Dict, List, Any, Tuple


BASE_URL = "http://74.249.60.46:5000"


class AgentNeo:
    def __init__(
        self,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        email: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.base_url = base_url or BASE_URL
        self.token = None

        if access_key and secret_key:
            self.access_key = access_key
            self.secret_key = secret_key
        elif email:
            self.access_key, self.secret_key = self._get_or_create_user(email)
        else:
            raise ValueError(
                "Either (access_key, secret_key) or email must be provided"
            )

        if not self.authenticate():
            raise AuthenticationError("Invalid or empty access key and secret key.")

    def _get_or_create_user(self, email: str) -> Tuple[str, str]:
        try:
            keys = self.get_user_keys(email)
            print(f"Existing user found for email: {email}")
            print("Please keep your access key and secret key handy for future logins:")
            print(f"Access Key: {keys['access_key']}")
            print(f"Secret Key: {keys['secret_key']}")
            return keys["access_key"], keys["secret_key"]
        except KeyRetrievalError:
            print(f"User not found for email: {email}. Creating new user...")
            try:
                user = self.create_user(email)
                print(f"New user created for email: {email}")
                print(
                    "Please keep your access key and secret key handy for future logins:"
                )
                print(f"Access Key: {user['access_key']}")
                print(f"Secret Key: {user['secret_key']}")
                return user["access_key"], user["secret_key"]
            except UserCreationError as e:
                print(f"Failed to create user: {str(e)}")
                raise AuthenticationError(
                    f"Unable to authenticate or create user for email: {email}"
                )

    def authenticate(self):
        if not self.access_key or not self.secret_key:
            return False
        try:
            response = requests.post(
                f"{self.base_url}/auth/authenticate",
                json={"access_key": self.access_key, "secret_key": self.secret_key},
                timeout=10,
            )
            response.raise_for_status()
            self.token = response.json()["token"]
            return True
        except requests.RequestException as e:
            print(f"Authentication failed: {str(e)}")
            return False
        except KeyError:
            print("Authentication failed: Invalid response format")
            return False

    def get_user_keys(self, email: str) -> Dict[str, str]:
        response = requests.post(
            f"{self.base_url}/auth/get_user_keys",
            json={"email": email},
        )
        if response.status_code == 200:
            data = response.json()
            if "access_key" in data and "secret_key" in data:
                return data
        raise KeyRetrievalError(f"Failed to retrieve keys for user: {email}")

    def create_user(self, email: str) -> Dict:
        response = requests.post(
            f"{self.base_url}/auth/create_user",
            json={"email": email},
        )
        if response.status_code == 201:
            return response.json()
        raise UserCreationError(f"Failed to create user: {response.json()}")

    def _check_authentication(self):
        if not self.token:
            return self.authenticate()
        return True

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        files: Optional[Dict] = None,
    ):
        if not self._check_authentication():
            raise Exception("Authentication failed")

        headers = {"Authorization": f"Bearer {self.token}"}
        url = f"{self.base_url}/{endpoint}"

        if method == "GET":
            response = requests.get(url, headers=headers, params=data)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, files=files)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        if response.status_code in (200, 201):
            return response.json()
        else:
            raise Exception(f"Request failed: {response.json()}")


class AuthenticationError(Exception):
    pass


class KeyRetrievalError(Exception):
    pass


class UserCreationError(Exception):
    pass
