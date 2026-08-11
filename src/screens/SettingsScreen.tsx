import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { IconButton, Label, Notice, PrimaryButton, SecondaryButton } from '../components/ui'
import { clearAnalysisCache } from '../lib/learningApi'
import {
  currentSettings,
  DEFAULT_SETTINGS,
  saveSettings,
  testApi,
  testOllama,
  type ConnectionCheck,
} from '../lib/settings'
import type { RootStackParamList } from '../navigation'
import { color, radius, space, type } from '../theme/tokens'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

export function SettingsScreen({ navigation }: Props) {
  const [apiUrl, setApiUrl] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('')
  const [ollamaModel, setOllamaModel] = useState('')

  const [apiCheck, setApiCheck] = useState<ConnectionCheck | null>(null)
  const [ollamaCheck, setOllamaCheck] = useState<ConnectionCheck | null>(null)
  const [testingApi, setTestingApi] = useState(false)
  const [testingOllama, setTestingOllama] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const settings = currentSettings()
    setApiUrl(settings.apiUrl)
    setOllamaUrl(settings.ollamaUrl)
    setOllamaModel(settings.ollamaModel)
  }, [])

  async function save() {
    await saveSettings({ apiUrl, ollamaUrl, ollamaModel })
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  async function checkApi() {
    setTestingApi(true)
    setApiCheck(null)
    setApiCheck(await testApi(apiUrl))
    setTestingApi(false)
  }

  async function checkOllama() {
    setTestingOllama(true)
    setOllamaCheck(null)
    setOllamaCheck(await testOllama(ollamaUrl, ollamaModel))
    setTestingOllama(false)
  }

  function resetCache() {
    Alert.alert('Clear saved lookups?', 'Words and sentences you saved are kept. Only the cache is cleared.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void clearAnalysisCache().then((count) => {
            Alert.alert('Cache cleared', `${count} saved ${count === 1 ? 'lookup' : 'lookups'} removed.`)
          })
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={navigation.goBack} />
        <View style={styles.headerText}>
          <Label>Settings</Label>
          <Text style={type.title}>Where meanings come from</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Notice tone="info">
            The hosted server only knows a small built-in dictionary. For every other word, point the app at
            Ollama running on your own computer.
          </Notice>

          <View style={styles.section}>
            <Label>Local Ollama (recommended)</Label>
            <Text style={type.caption}>
              On your computer run Ollama with OLLAMA_HOST=0.0.0.0, allow port 11434 through the firewall, and
              keep both devices on the same Wi-Fi. Then enter that computer’s address below.
            </Text>
            <Field
              label="Address"
              value={ollamaUrl}
              onChangeText={setOllamaUrl}
              placeholder="http://192.168.1.7:11434"
              keyboardType="url"
            />
            <Field
              label="Model"
              value={ollamaModel}
              onChangeText={setOllamaModel}
              placeholder={DEFAULT_SETTINGS.ollamaModel}
            />
            <SecondaryButton
              label="Test connection"
              icon="wifi"
              onPress={checkOllama}
              busy={testingOllama}
            />
            {ollamaCheck ? <Result check={ollamaCheck} /> : null}
          </View>

          <View style={styles.section}>
            <Label>Hosted server</Label>
            <Text style={type.caption}>
              Used when no local model answers. Leave the default unless you host the API yourself.
            </Text>
            <Field
              label="Address"
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder={DEFAULT_SETTINGS.apiUrl}
              keyboardType="url"
            />
            <SecondaryButton label="Test connection" icon="wifi" onPress={checkApi} busy={testingApi} />
            {apiCheck ? <Result check={apiCheck} /> : null}
          </View>

          <View style={styles.section}>
            <Label>Storage</Label>
            <SecondaryButton label="Clear cached lookups" icon="trash-2" onPress={resetCache} />
          </View>

          <PrimaryButton
            label={saved ? 'Saved' : 'Save settings'}
            icon={saved ? 'check' : 'save'}
            onPress={save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  keyboardType?: 'url' | 'default'
}) {
  return (
    <View style={styles.field}>
      <Text style={type.label}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.faint}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  )
}

function Result({ check }: { check: ConnectionCheck }) {
  return <Notice tone={check.ok ? 'info' : 'alert'}>{check.detail}</Notice>
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.cream },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: color.paper,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  headerText: { flex: 1, gap: space.xs },

  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxxl },
  section: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: color.paper,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
  },
  field: { gap: space.xs },
  input: {
    height: 46,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    backgroundColor: color.cream,
    borderWidth: 1,
    borderColor: color.line,
    ...type.body,
    fontSize: 15,
  },
})
