def boot_write(msg)
  begin
    begin
      Machine.tud_task if Machine.respond_to?(:tud_task)
    rescue NameError
    rescue
    end
    Machine.debug_puts(msg)
    return
  rescue
  end
  begin
    if STDOUT.respond_to?(:write)
      STDOUT.write(msg)
      begin
        Machine.tud_task if Machine.respond_to?(:tud_task)
      rescue NameError
      rescue
      end
    end
  rescue NameError
  rescue
  end
end

def boot_log(msg)
  boot_write("#{msg}\n")
end

begin
  STDOUT = IO.new
  STDIN = IO.new
  $stdout = STDOUT
  $stdin = STDIN
rescue => e
  boot_log "main_task: stdio init failed: #{e.message} (#{e.class})"
end

boot_log "main_task: boot start"

def safe_require(name)
  require name
  true
rescue => e
  boot_log "main_task: require #{name} failed: #{e.message} (#{e.class})"
  false
end

if RUBY_ENGINE == "mruby/c"
  safe_require "numeric-ext"
end
safe_require "machine"
if safe_require("watchdog")
  begin
    Watchdog.disable
  rescue => e
    boot_log "main_task: Watchdog.disable failed: #{e.message} (#{e.class})"
  end
end
safe_require "shell"
safe_require "irq"

def rp2040js_platform?
  begin
    return Machine.rp2040js?
  rescue
  end
  raw = Machine.read_memory(0x40000004, 4)
  return false unless raw && raw.bytesize >= 4
  value =
    raw.getbyte(0) |
    (raw.getbyte(1) << 8) |
    (raw.getbyte(2) << 16) |
    (raw.getbyte(3) << 24)
  (value & 0x01000000) != 0
rescue
  false
end

def log(msg)
  if rp2040js_platform?
    boot_write("#{msg}\n")
  else
    Machine.debug_puts(msg)
  end
end

begin
  Machine.set_hwclock(0) unless rp2040js_platform?
rescue => e
  log "main_task: set_hwclock failed: #{e.message} (#{e.class})"
end

begin
  log "main_task: enter"
  sleep 1 unless rp2040js_platform?
  STDIN.echo = false
  log "main_task: io ready"
  if rp2040js_platform?
    Task.new(name: "usb_task") do
      loop do
        Machine.tud_task
        sleep_ms 1
      end
    end
  end
  if rp2040js_platform?
    log "main_task: rp2040js mode: skip filesystem bootstrap"
  else
    root_device = :flash
    log "main_task: setup root volume"
    log "Initializing #{root_device.to_s.upcase} disk as the root volume... "
    Shell.setup_root_volume(root_device, label: "R2P2")
    log "main_task: setup system files"
    Shell.setup_system_files

    log "main_task: bootstrap"
    Shell.bootstrap("/etc/init.d/r2p2")
  end

  log "main_task: shell new"
  shell = Shell.new(clean: true)
  STDOUT.write("Starting shell...\n\n")

  shell.show_logo
  shell.start
rescue => e
  log "#{e.message} (#{e.class})"
end
