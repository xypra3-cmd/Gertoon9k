Pod::Spec.new do |s|
  s.name           = 'EventActivity'
  s.version        = '1.0.0'
  s.summary        = 'Digital Card Event mode Live Activity'
  s.description    = 'Starts, updates and ends the Event mode Live Activity (ActivityKit).'
  s.author         = 'Digital Card'
  s.homepage       = 'https://digitalcard.mn'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift}'
end
