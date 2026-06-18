import sys

with open('src/app/dashboard/interview/page.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# 1. Add Custom Job Description to roles array
if "'Custom Job Description'" not in content:
    content = content.replace(
        "  'Management Trainee',\n];",
        "  'Management Trainee',\n  'Custom Job Description',\n];"
    )

# 2. Add customJD state
if "const [customJD, setCustomJD] = useState('');" not in content:
    content = content.replace(
        "  const [selectedRole, setSelectedRole] = useState('Product Manager');",
        "  const [selectedRole, setSelectedRole] = useState('Product Manager');\n  const [customJD, setCustomJD] = useState('');"
    )

# 3. Add customJD textarea in UI
jd_ui = """            {selectedRole === 'Custom Job Description' && (
              <div className="field" style={{ marginBottom: '1.4rem' }}>
                <textarea 
                  rows={4} 
                  placeholder="Paste the Job Description here. The AI will tailor the mock interview specifically to this role."
                  value={customJD}
                  onChange={(e) => setCustomJD(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}

            <button className="btn btn-primary" onClick={startInterview}>"""

content = content.replace(
    "            <button className=\"btn btn-primary\" onClick={startInterview}>",
    jd_ui
)

with open('src/app/dashboard/interview/page.tsx', 'w', encoding='utf8') as f:
    f.write(content)

print("Updated page.tsx")
