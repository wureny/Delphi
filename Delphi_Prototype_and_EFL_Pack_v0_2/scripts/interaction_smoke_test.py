#!/usr/bin/env python3
"""Render the self-contained HTML artifacts and smoke-test the core prototype flow."""
from __future__ import annotations

from pathlib import Path
import shutil

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "previews"
PREVIEWS.mkdir(exist_ok=True)


def render(page, relative: str, screenshot: str) -> list[str]:
    errors: list[str] = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on("console", lambda msg: errors.append(f"console {msg.type}: {msg.text}") if msg.type == "error" else None)
    page.set_content((ROOT / relative).read_text(encoding="utf-8"), wait_until="load")
    page.wait_for_timeout(250)
    page.screenshot(path=str(PREVIEWS / screenshot), full_page=False)
    return errors


def main() -> None:
    chromium_path = shutil.which("chromium")
    launch_args = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]}
    if chromium_path:
        launch_args["executable_path"] = chromium_path

    all_errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**launch_args)

        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        all_errors += render(page, "html/index.html", "portal.png")
        assert "Delphi" in page.title()
        assert page.locator("#docGrid .doc").count() >= 20
        page.close()

        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        all_errors += render(page, "html/Delphi_Prototype_Wireframe.html", "prototype.png")
        assert page.locator("#queueList .queue-item").count() == 4
        page.locator("#presetBtn").click()
        assert page.locator("#metricApproved").inner_text() == "3"
        assert not page.locator("#applyBtn").is_disabled()
        page.locator("#applyBtn").click()
        page.wait_for_timeout(700)
        assert page.locator("#page-ledger").evaluate("element => element.classList.contains('active')")
        assert "v12" in page.locator(".version-flow").inner_text()
        assert "v13" in page.locator(".version-flow").inner_text()
        page.screenshot(path=str(PREVIEWS / "prototype-ledger.png"), full_page=False)

        page.locator("#modeSelect").select_option("degraded")
        page.locator("#replayBtn").click()
        page.wait_for_timeout(3200)
        assert page.locator("#bigRunStatus").inner_text() == "Degraded"
        assert "2 / 3" in page.locator("#runMeta").inner_text()
        page.screenshot(path=str(PREVIEWS / "prototype-degraded.png"), full_page=False)
        page.close()

        for name, relative in [
            ("website.png", "html/Delphi_Company_Website_Mockup.html"),
            ("architecture.png", "html/Delphi_Architecture_Board.html"),
        ]:
            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            all_errors += render(page, relative, name)
            assert page.locator("h1").count() == 1
            page.close()

        browser.close()

    if all_errors:
        raise RuntimeError("Browser errors: " + " | ".join(all_errors))
    print("INTERACTION SMOKE TEST PASSED")
    print("- documentation portal renders")
    print("- prototype renders four proposals")
    print("- demo review preset approves three and escalates one")
    print("- applying reviews creates a visible v12 → v13 transition")
    print("- degraded replay reports 2 / 3 sources and explicit gaps")
    print("- website and architecture board render without page errors")


if __name__ == "__main__":
    main()
