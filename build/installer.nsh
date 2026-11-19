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
