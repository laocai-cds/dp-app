; Tắt DP-DangPhi đang chạy (kể cả chạy nền ở khay hệ thống) trước khi cài, để bộ cài ghi đè được bản cũ.
!macro customInit
  nsExec::Exec 'taskkill /F /T /IM "DP-DangPhi.exe"'
  Pop $0
  Sleep 1500
!macroend

!macro customUnInit
  nsExec::Exec 'taskkill /F /T /IM "DP-DangPhi.exe"'
  Pop $0
  Sleep 800
!macroend

; Xóa lối tắt tên cũ (DP-DangPhi) để không bị trùng với lối tắt mới "Đồng bộ DVC Lào Cai".
!macro customInstall
  Delete "$DESKTOP\DP-DangPhi.lnk"
  Delete "$SMPROGRAMS\DP-DangPhi.lnk"
!macroend
