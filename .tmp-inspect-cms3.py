
import pathlib
t = pathlib.Path(r"G:\ccode\my-blog\public\admin\decap-cms.js").read_text(encoding="utf-8", errors="replace")

print("===== widgetFor rest =====")
i = t.find("widgetFor=(e,t=this.props.fields")
print(t[i:i+1800])

print("\n===== Wd function =====")
i = t.find("function Wd(e)")
print("idx", i)
print(t[i:i+250] if i>=0 else "")

print("\n===== retrieveLocalBackup action =====")
i = t.find("retrieveLocalBackup")
print(t[i-200:i+600])

print("\n===== Fi() definition nearby listFiles =====")
i = t.find("async listFiles(e,{repoURL")
print(t[i:i+700])

