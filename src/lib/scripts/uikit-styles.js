import {setPreferredColorScheme, StyleSheet} from '@pmndrs/uikit'

setPreferredColorScheme("dark");

StyleSheet['buttonPrimary'] = {
    width: '100%',
    backgroundColor: '#10b981',
    color: '#ffffff',
    borderWidth: 0,
    borderRadius: 8,
    paddingY: 12,
    hover: {
        backgroundColor: '#059669',
    },
}

StyleSheet['menuContainer'] = {
    minWidth: 300,
    backgroundColor: '#1e293b',
    color: "#fff",
    borderRadius: 24,
    padding: 20,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: "column",
    alignItems: "center"
}

StyleSheet['menuHeader'] = {
    textAlign: 'center',
    color: '#f1f5f9',
    marginBottom: 12,
    fontSize: 20
}

StyleSheet['menuBlock'] = {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: "column",
}

StyleSheet['section'] = {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
}

StyleSheet['sectionInner'] = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
}

StyleSheet['input'] = {
    backgroundColor: '#020617',
    borderColor: '#475569',
    color: '#f1f5f9',
    placeholderColor: '#64748b',
    borderWidth: 1,
    paddingX: 12,
    paddingY: 12,
    borderRadius: 8,
    focus: {
        borderColor: '#10b981',
        boxShadow: '0 0 0 2px rgba(16,185,129,0.5)',
    },
}

StyleSheet['VRButton'] = {
    backgroundColor: '#334155',
    color: '#f1f5f9',
    borderRadius: 16,
    hover: {
        backgroundColor: '#475569'
    }
}
