import Swal from 'sweetalert2'

export const appSwal = Swal.mixin({
  background: '#0f172a',
  color: '#f8fafc',
  buttonsStyling: false,
  customClass: {
    popup: 'app-swal-popup',
    title: 'app-swal-title',
    htmlContainer: 'app-swal-html',
    input: 'app-swal-input',
    confirmButton: 'app-swal-confirm',
    cancelButton: 'app-swal-cancel',
    denyButton: 'app-swal-deny'
  }
})

export function fireSwal(options) {
  return appSwal.fire(options)
}
