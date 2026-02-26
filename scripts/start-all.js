const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const readline = require("node:readline");

const isWindows = process.platform === "win32";

const runCommand = (command, args, label) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const pipeWithPrefix = (stream, prefix, target) => {
      const rl = readline.createInterface({ input: stream });
      rl.on("line", (line) => {
        target.write(`[${prefix}] ${line}\n`);
      });
    };

    pipeWithPrefix(child.stdout, label, process.stdout);
    pipeWithPrefix(child.stderr, label, process.stderr);

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} exited with code ${code}`));
      }
    });
  });

const runCommandInDir = (command, args, label, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const pipeWithPrefix = (stream, prefix, target) => {
      const rl = readline.createInterface({ input: stream });
      rl.on("line", (line) => {
        target.write(`[${prefix}] ${line}\n`);
      });
    };

    pipeWithPrefix(child.stdout, label, process.stdout);
    pipeWithPrefix(child.stderr, label, process.stderr);

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} exited with code ${code}`));
      }
    });
  });

const spawnLongRunning = (command, args, label) => {
  const child = spawn(command, args, {
    shell: true,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const pipeWithPrefix = (stream, prefix, target) => {
    const rl = readline.createInterface({ input: stream });
    rl.on("line", (line) => {
      target.write(`[${prefix}] ${line}\n`);
    });
  };

  pipeWithPrefix(child.stdout, label, process.stdout);
  pipeWithPrefix(child.stderr, label, process.stderr);

  return child;
};

const killProcess = (child) => {
  if (!child || child.killed) {
    return;
  }

  if (isWindows) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      shell: true,
      stdio: "ignore",
    });
  } else {
    child.kill("SIGTERM");
  }
};

const isPortInUse = (port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("error", () => {
      resolve(false);
    });
  });

const isMetroRunning = () =>
  new Promise((resolve) => {
    const request = http.get("http://127.0.0.1:8081/status", (response) => {
      let body = "";

      response.on("data", (chunk) => {
        body += chunk.toString();
      });

      response.on("end", () => {
        resolve(
          response.statusCode === 200 && body.includes("packager-status:running")
        );
      });
    });

    request.on("error", () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });

const waitForMetroReady = async ({ getExitCode }) => {
  for (;;) {
    if (await isMetroRunning()) {
      return;
    }

    const exitCode = getExitCode();
    if (exitCode !== null && exitCode !== undefined && exitCode !== 0) {
      throw new Error(`Metro exited with code ${exitCode}`);
    }

    await sleep(1000);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runCommandCapture = (command, args, label, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `${label} exited with code ${code}${
              stderr ? `: ${stderr.trim()}` : ""
            }`
          )
        );
      }
    });
  });

const getSdkDirFromLocalProperties = (androidProjectDir) => {
  const localPropertiesPath = path.join(androidProjectDir, "local.properties");
  if (!fs.existsSync(localPropertiesPath)) {
    return null;
  }

  const content = fs.readFileSync(localPropertiesPath, "utf8");
  const sdkDirLine = content
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("sdk.dir="));

  if (!sdkDirLine) {
    return null;
  }

  const rawValue = sdkDirLine.slice("sdk.dir=".length).trim();
  if (!rawValue) {
    return null;
  }

  return rawValue.replace(/\\:/g, ":").replace(/\\\\/g, "\\");
};

const getSdkCandidates = (androidProjectDir) =>
  [
    getSdkDirFromLocalProperties(androidProjectDir),
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    isWindows
      ? path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk")
      : path.join(process.env.HOME || "", "Android", "Sdk"),
  ].filter(Boolean);

const resolveAdbCommand = (androidProjectDir) => {
  const sdkCandidates = getSdkCandidates(androidProjectDir);

  const adbFileName = isWindows ? "adb.exe" : "adb";

  for (const sdkDir of sdkCandidates) {
    const adbPath = path.join(sdkDir, "platform-tools", adbFileName);
    if (fs.existsSync(adbPath)) {
      return adbPath;
    }
  }

  return null;
};

const resolveEmulatorCommand = (androidProjectDir) => {
  const sdkCandidates = getSdkCandidates(androidProjectDir);
  const emulatorFileName = isWindows ? "emulator.exe" : "emulator";

  for (const sdkDir of sdkCandidates) {
    const emulatorPath = path.join(sdkDir, "emulator", emulatorFileName);
    if (fs.existsSync(emulatorPath)) {
      return emulatorPath;
    }
  }

  return null;
};

const parseConnectedDeviceIds = (adbDevicesOutput) =>
  adbDevicesOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices attached"))
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === "device")
    .map((parts) => parts[0]);

const getConnectedDeviceIds = async (adbCommand) => {
  const output = await runCommandCapture(
    adbCommand,
    ["devices"],
    "android-devices"
  );
  return parseConnectedDeviceIds(output);
};

const selectAvdName = async (emulatorCommand) => {
  const requestedAvd = process.env.ANDROID_AVD_NAME?.trim();
  const avdOutput = await runCommandCapture(
    emulatorCommand,
    ["-list-avds"],
    "android-avds"
  );
  const avdNames = avdOutput
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  if (avdNames.length === 0) {
    throw new Error(
      "No Android Virtual Devices found. Create an AVD in Android Studio Device Manager first."
    );
  }

  if (requestedAvd) {
    if (!avdNames.includes(requestedAvd)) {
      throw new Error(
        `ANDROID_AVD_NAME='${requestedAvd}' was not found. Available AVDs: ${avdNames.join(
          ", "
        )}`
      );
    }

    return requestedAvd;
  }

  return avdNames[0];
};

const waitForDeviceOnline = async (adbCommand) => {
  const maxChecks = 90;

  for (let i = 0; i < maxChecks; i += 1) {
    const deviceIds = await getConnectedDeviceIds(adbCommand);
    if (deviceIds.length > 0) {
      return deviceIds[0];
    }

    await sleep(2000);
  }

  throw new Error("Timed out waiting for an Android device to connect.");
};

const waitForBootCompleted = async (adbCommand, deviceId) => {
  const maxChecks = 90;

  for (let i = 0; i < maxChecks; i += 1) {
    const bootStatus = await runCommandCapture(
      adbCommand,
      ["-s", deviceId, "shell", "getprop", "sys.boot_completed"],
      "android-boot"
    );

    if (bootStatus.trim() === "1") {
      return;
    }

    await sleep(2000);
  }

  throw new Error("Timed out waiting for Android emulator to finish booting.");
};

const ensureAndroidDevice = async (adbCommand, emulatorCommand) => {
  const existingDevices = await getConnectedDeviceIds(adbCommand);
  if (existingDevices.length > 0) {
    process.stdout.write(
      `[android-device] Using connected device ${existingDevices[0]}\n`
    );
    return existingDevices[0];
  }

  if (!emulatorCommand) {
    throw new Error(
      "No connected Android devices and unable to locate emulator executable in Android SDK."
    );
  }

  const avdName = await selectAvdName(emulatorCommand);
  process.stdout.write(
    `[android-device] No connected device found. Starting emulator '${avdName}'...\n`
  );

  const emulatorProcess = spawn(emulatorCommand, ["-avd", avdName], {
    shell: false,
    windowsHide: true,
    detached: true,
    stdio: "ignore",
  });
  emulatorProcess.unref();

  const deviceId = await waitForDeviceOnline(adbCommand);
  process.stdout.write(
    `[android-device] Device connected: ${deviceId}. Waiting for boot...\n`
  );
  await waitForBootCompleted(adbCommand, deviceId);
  process.stdout.write("[android-device] Emulator boot completed.\n");

  return deviceId;
};

const main = async () => {
  try {
    await runCommand(
      "docker",
      ["compose", "up", "-d", "--build", "db", "backend"],
      "stack"
    );

    const backendLogs = spawnLongRunning(
      "docker",
      ["compose", "logs", "-f", "--tail", "50", "backend"],
      "backend"
    );

    let metro = null;
    let metroExitCode = null;
    const metroAlreadyRunning = await isMetroRunning();
    if (metroAlreadyRunning) {
      process.stdout.write(
        "[metro] Existing Metro detected on port 8081. Reusing it.\n"
      );
    } else {
      const metroPortBusy = await isPortInUse(8081);
      if (metroPortBusy) {
        throw new Error(
          "Port 8081 is in use by a non-Metro process. Stop that process before running start:all."
        );
      }

      metro = spawnLongRunning(
        "npm",
        ["--prefix", "projectBinx", "run", "start"],
        "metro"
      );

      metro.on("close", (code) => {
        metroExitCode = code;
        if (code && code !== 0) {
          killProcess(backendLogs);
          process.exit(code);
        }
      });

      await waitForMetroReady({
        getExitCode: () => metroExitCode,
      });
      process.stdout.write("[metro] Metro is ready on port 8081.\n");
    }

    const androidProjectDir = path.join(
      process.cwd(),
      "projectBinx",
      "android"
    );
    const gradleCommand = isWindows ? "gradlew.bat" : "./gradlew";
    const adbCommand = resolveAdbCommand(androidProjectDir);
    const emulatorCommand = resolveEmulatorCommand(androidProjectDir);

    if (!adbCommand) {
      throw new Error(
        "Unable to locate adb. Install Android SDK Platform-Tools and ensure sdk.dir is set in projectBinx/android/local.properties."
      );
    }

    process.stdout.write(`[android-bridge] Using adb at ${adbCommand}\n`);

    const deviceId = await ensureAndroidDevice(adbCommand, emulatorCommand);

    await runCommandInDir(
      gradleCommand,
      ["app:installDebug"],
      "android-build",
      androidProjectDir
    );
    await runCommand(
      adbCommand,
      ["-s", deviceId, "reverse", "tcp:8081", "tcp:8081"],
      "android-bridge"
    );
    await runCommand(
      adbCommand,
      [
        "-s",
        deviceId,
        "shell",
        "am",
        "start",
        "-n",
        "com.projectbinx/com.projectbinx.MainActivity",
      ],
      "android-launch"
    );

    const shutdown = () => {
      killProcess(backendLogs);
      killProcess(metro);
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    backendLogs.on("close", (code) => {
      if (code && code !== 0) {
        killProcess(metro);
        process.exit(code);
      }
    });
  } catch (error) {
    process.stderr.write(`[start:all] ${error.message}\n`);
    process.exit(1);
  }
};

main();
