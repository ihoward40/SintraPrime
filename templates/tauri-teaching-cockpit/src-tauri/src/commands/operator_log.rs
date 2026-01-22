use std::fs::OpenOptions;
use std::io::Write;

#[tauri::command]
pub fn append_operator_log(entry_json: String) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open("OPERATOR_LOG.jsonl")
        .map_err(|e| e.to_string())?;

    file.write_all(entry_json.as_bytes())
        .and_then(|_| file.write_all(b"\n"))
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn read_operator_log_tail(lines: usize) -> Result<Vec<String>, String> {
    let content = std::fs::read_to_string("OPERATOR_LOG.jsonl").map_err(|e| e.to_string())?;

    Ok(content
        .lines()
        .rev()
        .take(lines)
        .map(|s| s.to_string())
        .collect())
}
