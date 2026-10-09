import socket
import unittest

import local_app


class LocalAppTests(unittest.TestCase):
    def test_docs_directory_exists(self):
        self.assertTrue(local_app.DOCS_DIR.exists())
        self.assertTrue((local_app.DOCS_DIR / "index.html").exists())

    def test_choose_port_skips_occupied_port(self):
        occupied = local_app.choose_port("127.0.0.1", 18080, attempts=20)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", occupied))
        try:
            chosen = local_app.choose_port("127.0.0.1", occupied, attempts=5)
            self.assertNotEqual(chosen, occupied)
            self.assertGreater(chosen, occupied)
        finally:
            sock.close()

    def test_server_can_bind(self):
        port = local_app.choose_port("127.0.0.1", 18080, attempts=20)
        server = local_app.build_server("127.0.0.1", port)
        try:
            self.assertEqual(server.server_address[1], port)
        finally:
            server.server_close()


if __name__ == "__main__":
    unittest.main()
